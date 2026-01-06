import { useMemo } from 'react';
import {
  ArrayUtils,
} from '@openmsupply-client/common';
import { useSupplierReturn } from '../document/useSupplierReturn';
import { SupplierReturnLineFragment } from '../../operations.generated';
import { SupplierReturnItem } from '../../../../types';

const getSupplierReturnItems = (lines: SupplierReturnLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      itemId: lines[0]?.itemId,
      lines,
    } as SupplierReturnItem;
  });

export const useSupplierReturnRows = () => {
  const { data: lineData } = useSupplierReturn();
  const lines = lineData?.lines?.nodes ?? [];
  const items = useMemo(() => getSupplierReturnItems(lines), [lines]);
  const totalLineCount = lineData?.lines?.nodes.length ?? 0;

  return {
    items,
    lines,
    totalLineCount,
  };
};
