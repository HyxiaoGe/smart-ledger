import type { ICategoryRepository } from '@/lib/domain/repositories/ICategoryRepository';
import type { ICommonNoteRepository } from '@/lib/domain/repositories/ICommonNoteRepository';
import type { IPaymentMethodRepository } from '@/lib/domain/repositories/IPaymentMethodRepository';
import type { ITransactionRepository } from '@/lib/domain/repositories/ITransactionRepository';
import type { MerchantSuggestion, Subcategory } from '@/types/dto/category.dto';
import type { CreateTransactionDTO } from '@/types/dto/transaction.dto';
import type { Transaction } from '@/types/domain/transaction';

type EnrichmentDependencies = {
  transactionRepository: ITransactionRepository;
  commonNoteRepository: ICommonNoteRepository;
  categoryRepository: ICategoryRepository;
  paymentMethodRepository: IPaymentMethodRepository;
};

type EnrichmentDecision = {
  transaction?: Transaction;
  score: number;
  exactNoteMatch: boolean;
};

export type TransactionEnrichmentField =
  | 'payment_method'
  | 'merchant'
  | 'subcategory'
  | 'product';

export type TransactionEnrichmentPreview = {
  enrichedInput: CreateTransactionDTO;
  changedFields: TransactionEnrichmentField[];
};

const EXACT_AMOUNT_EPSILON = 0.01;
const HISTORY_MATCH_THRESHOLD = 5;
const MERCHANT_HINT_THRESHOLD = 2;

export class TransactionEnrichmentService {
  constructor(private readonly deps: EnrichmentDependencies) {}

  async enrichCreateInput(input: CreateTransactionDTO): Promise<CreateTransactionDTO> {
    const preview = await this.previewCreateInputEnrichment(input);
    return preview.enrichedInput;
  }

  async previewCreateInputEnrichment(
    input: CreateTransactionDTO
  ): Promise<TransactionEnrichmentPreview> {
    const normalizedInput = this.normalizeInput(input);
    const note = normalizedInput.note?.trim();

    const [recentTransactions, commonNote, subcategories, frequentMerchants, defaultPaymentMethod] =
      await Promise.all([
        this.deps.transactionRepository.findRecent(50, normalizedInput.type),
        note ? this.deps.commonNoteRepository.findByContent(note) : Promise.resolve(null),
        this.needsSubcategory(normalizedInput)
          ? this.deps.categoryRepository.getSubcategories(normalizedInput.category)
          : Promise.resolve([] as Subcategory[]),
        this.needsMerchant(normalizedInput)
          ? this.deps.categoryRepository.getFrequentMerchants(normalizedInput.category, 8)
          : Promise.resolve([] as MerchantSuggestion[]),
        !normalizedInput.payment_method
          ? this.deps.paymentMethodRepository.findDefault()
          : Promise.resolve(null),
      ]);

    const match = this.findBestHistoricalMatch(normalizedInput, recentTransactions);
    const exactMatch = Boolean(match.transaction && match.exactNoteMatch);

    const merchantFromHistory =
      match.score >= HISTORY_MATCH_THRESHOLD ? match.transaction?.merchant : undefined;
    const merchantFromNote = this.inferMerchantFromNote(note, frequentMerchants);
    const merchant =
      normalizedInput.merchant ||
      commonNote?.merchant ||
      merchantFromHistory ||
      merchantFromNote;

    const subcategoryFromHistory =
      match.score >= HISTORY_MATCH_THRESHOLD ? match.transaction?.subcategory : undefined;
    const subcategoryFromNote = this.inferSubcategory(note, merchant, subcategories);
    const subcategory =
      normalizedInput.subcategory ||
      commonNote?.subcategory ||
      subcategoryFromHistory ||
      subcategoryFromNote;

    const paymentMethod =
      normalizedInput.payment_method ||
      (match.score >= HISTORY_MATCH_THRESHOLD ? match.transaction?.payment_method : undefined) ||
      defaultPaymentMethod?.id;

    const product =
      normalizedInput.product ||
      (exactMatch ? match.transaction?.product : undefined) ||
      this.inferProduct(note, merchant);

    const enrichedInput = {
      ...normalizedInput,
      payment_method: paymentMethod,
      merchant,
      subcategory,
      product,
    };

    const changedFields = this.collectChangedFields(normalizedInput, enrichedInput);

    return {
      enrichedInput,
      changedFields,
    };
  }

  private normalizeInput(input: CreateTransactionDTO): CreateTransactionDTO {
    return {
      ...input,
      note: this.normalizeString(input.note),
      payment_method: this.normalizeString(input.payment_method),
      merchant: this.normalizeString(input.merchant),
      subcategory: this.normalizeString(input.subcategory),
      product: this.normalizeString(input.product),
    };
  }

  private normalizeString(value?: string | null): string | undefined {
    const next = value?.trim();
    return next ? next : undefined;
  }

  private needsMerchant(input: CreateTransactionDTO): boolean {
    return !this.normalizeString(input.merchant);
  }

  private needsSubcategory(input: CreateTransactionDTO): boolean {
    return !this.normalizeString(input.subcategory);
  }

  private findBestHistoricalMatch(
    input: CreateTransactionDTO,
    transactions: Transaction[]
  ): EnrichmentDecision {
    const relevantTransactions = transactions.filter((transaction) => {
      return (
        transaction.category === input.category &&
        transaction.type === input.type &&
        (transaction.currency || 'CNY') === (input.currency || 'CNY')
      );
    });

    let bestMatch: EnrichmentDecision = {
      score: 0,
      exactNoteMatch: false,
    };

    for (const transaction of relevantTransactions) {
      const score = this.scoreTransactionMatch(input, transaction);
      const exactNoteMatch = this.isExactNoteMatch(input.note, transaction.note);

      if (score > bestMatch.score) {
        bestMatch = {
          transaction,
          score,
          exactNoteMatch,
        };
      }
    }

    return bestMatch;
  }

  private scoreTransactionMatch(input: CreateTransactionDTO, transaction: Transaction): number {
    let score = 0;

    if (this.hasExactAmountMatch(input.amount, transaction.amount)) {
      score += 4;
    } else if (this.hasCloseAmountMatch(input.amount, transaction.amount)) {
      score += 2;
    }

    if (this.isExactNoteMatch(input.note, transaction.note)) {
      score += 6;
    } else if (this.hasLooseTextMatch(input.note, transaction.note)) {
      score += 3;
    }

    if (
      input.merchant &&
      transaction.merchant &&
      this.normalizeText(input.merchant) === this.normalizeText(transaction.merchant)
    ) {
      score += 4;
    }

    if (
      input.subcategory &&
      transaction.subcategory &&
      input.subcategory === transaction.subcategory
    ) {
      score += 3;
    }

    if (
      input.payment_method &&
      transaction.payment_method &&
      input.payment_method === transaction.payment_method
    ) {
      score += 2;
    }

    return score;
  }

  private hasExactAmountMatch(left: number, right?: number): boolean {
    if (right === undefined) return false;
    return Math.abs(left - right) <= EXACT_AMOUNT_EPSILON;
  }

  private hasCloseAmountMatch(left: number, right?: number): boolean {
    if (right === undefined) return false;
    const maxBase = Math.max(Math.abs(left), Math.abs(right), 1);
    return Math.abs(left - right) / maxBase <= 0.05;
  }

  private isExactNoteMatch(left?: string, right?: string): boolean {
    if (!left || !right) return false;
    return this.normalizeText(left) === this.normalizeText(right);
  }

  private hasLooseTextMatch(left?: string, right?: string): boolean {
    if (!left || !right) return false;
    const normalizedLeft = this.normalizeText(left);
    const normalizedRight = this.normalizeText(right);
    return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
  }

  private inferMerchantFromNote(
    note: string | undefined,
    merchants: MerchantSuggestion[]
  ): string | undefined {
    if (!note) return undefined;
    const normalizedNote = this.normalizeText(note);

    for (const merchant of merchants) {
      const normalizedMerchant = this.normalizeText(merchant.name);
      if (
        merchant.usage_count >= MERCHANT_HINT_THRESHOLD &&
        (normalizedNote.includes(normalizedMerchant) || normalizedMerchant.includes(normalizedNote))
      ) {
        return merchant.name;
      }
    }

    return undefined;
  }

  private inferSubcategory(
    note: string | undefined,
    merchant: string | undefined,
    subcategories: Subcategory[]
  ): string | undefined {
    const source = `${note || ''} ${merchant || ''}`.trim();
    if (!source) return undefined;

    const normalizedSource = this.normalizeText(source);
    for (const subcategory of subcategories) {
      const key = this.normalizeText(subcategory.key);
      const label = this.normalizeText(subcategory.label);
      if (normalizedSource.includes(key) || normalizedSource.includes(label)) {
        return subcategory.key;
      }
    }

    return undefined;
  }

  private inferProduct(note: string | undefined, merchant: string | undefined): string | undefined {
    if (!note || !merchant) return undefined;
    const normalizedNote = this.normalizeText(note);
    const normalizedMerchant = this.normalizeText(merchant);

    if (!normalizedNote || normalizedNote === normalizedMerchant) {
      return undefined;
    }

    if (note.length <= 2) {
      return undefined;
    }

    return note;
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '');
  }

  private collectChangedFields(
    originalInput: CreateTransactionDTO,
    enrichedInput: CreateTransactionDTO
  ): TransactionEnrichmentField[] {
    const changedFields: TransactionEnrichmentField[] = [];
    const fields: TransactionEnrichmentField[] = [
      'payment_method',
      'merchant',
      'subcategory',
      'product',
    ];

    for (const field of fields) {
      if (!originalInput[field] && enrichedInput[field]) {
        changedFields.push(field);
      }
    }

    return changedFields;
  }
}
