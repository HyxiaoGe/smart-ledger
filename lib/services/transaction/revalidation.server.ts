import { revalidateTag } from 'next/cache';

export function revalidateTransactions(): void {
  revalidateTag('transactions');
}

export function revalidateTransactionWrite(tags?: {
  includeCommonNotes?: boolean;
}): void {
  revalidateTransactions();

  if (tags?.includeCommonNotes) {
    revalidateTag('common-notes');
  }
}
