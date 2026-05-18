import { useMemo } from 'react';
import {
  ArrayUtils,
} from '@openmsupply-client/common';
import { useCustomerReturn } from '../document/useCustomerReturn';
import { CustomerReturnLineFragment } from '../../operations.generated';
import { CustomerReturnItem } from '../../../../types';

const getCustomerReturnItems = (lines: CustomerReturnLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      itemId: lines[0]?.itemId,
      lines,
    } as CustomerReturnItem;
  });

export const useCustomerReturnRows = () => {
  const { data: lineData } = useCustomerReturn();
  const lines = lineData?.lines?.nodes ?? [];
  const items = useMemo(
    () => getCustomerReturnItems(lines),
    [lines]
  );
  const totalLineCount = lineData?.lines?.totalCount ?? 0;

  return {
    items,
    lines,
    totalLineCount,
  };
};
