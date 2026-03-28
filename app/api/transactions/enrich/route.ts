import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { getEnrichmentService } from '@/lib/services/transaction/index.server';
import { getPaymentMethodRepository } from '@/lib/infrastructure/repositories/index.server';
import { validateRequest, commonSchemas } from '@/lib/utils/validation';
import type { TransactionType, Currency } from '@/types/domain/transaction';
import type { TransactionEnrichmentField } from '@/lib/services/transaction/TransactionEnrichmentService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const enrichmentPreviewSchema = z.object({
  type: z.enum(['expense', 'income']).default('expense'),
  category: z.string().min(1, '类别不能为空'),
  amount: z.number().positive('金额必须大于0'),
  note: z.string().optional(),
  date: z.string().min(1, '日期不能为空'),
  currency: commonSchemas.currency.optional().default('CNY'),
  payment_method: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
});

const FIELD_LABELS: Record<TransactionEnrichmentField, string> = {
  payment_method: '支付方式',
  merchant: '商家',
  subcategory: '子分类',
  product: '产品',
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = validateRequest(enrichmentPreviewSchema, body);

  if (!validation.success) {
    return validation.response;
  }

  const data = validation.data;
  const preview = await getEnrichmentService().previewCreateInputEnrichment({
    type: data.type as TransactionType,
    category: data.category,
    amount: data.amount,
    note: data.note,
    date: data.date,
    currency: data.currency as Currency,
    payment_method: data.payment_method || undefined,
    merchant: data.merchant || undefined,
    subcategory: data.subcategory || undefined,
    product: data.product || undefined,
  });

  const paymentMethodRepository = getPaymentMethodRepository();
  const fields = await Promise.all(
    preview.changedFields.map(async (field) => {
      const rawValue = preview.enrichedInput[field];
      const displayValue =
        field === 'payment_method' && rawValue
          ? await resolvePaymentMethodDisplayValue(paymentMethodRepository, rawValue)
          : rawValue;

      return {
        key: field,
        label: FIELD_LABELS[field],
        value: rawValue,
        displayValue: displayValue || rawValue,
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      enriched: preview.enrichedInput,
      fields,
    },
  });
});

async function resolvePaymentMethodDisplayValue(
  paymentMethodRepository: ReturnType<typeof getPaymentMethodRepository>,
  value: string
) {
  const paymentMethod = await paymentMethodRepository.findById(value);
  return paymentMethod?.name || value;
}
