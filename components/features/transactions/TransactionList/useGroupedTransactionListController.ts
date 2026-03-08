'use client';

import type { TransactionGroupedListProps } from './types';
import { useTransactionListExpansionState } from './useTransactionListExpansionState';
import { useTransactionListMutationState } from './useTransactionListMutationState';

type UseGroupedTransactionListControllerParams = Pick<
  TransactionGroupedListProps,
  'initialTransactions' | 'defaultExpandedDates'
>;

export function useGroupedTransactionListController({
  initialTransactions,
  defaultExpandedDates,
}: UseGroupedTransactionListControllerParams) {
  const expansionState = useTransactionListExpansionState(defaultExpandedDates);
  const mutationState = useTransactionListMutationState(initialTransactions);

  return {
    ...mutationState,
    ...expansionState,
  };
}
