import { ItemLike } from './types';
import {
  ItemRowFragment,
  ItemRowWithStatsFragment,
  ItemStockOnHandFragment,
  ItemWithPackSizeFragment,
} from './api';
import { styled } from '@common/styles';

export const toItemRow = (line: ItemLike): ItemRowFragment => ({
  __typename: 'ItemNode',
  id: ('lines' in line ? line.lines[0]?.item.id : line.item.id) || '',
  name: ('lines' in line ? line.lines[0]?.item.name : line.item.name) || '',
  code: ('lines' in line ? line.lines[0]?.item.code : line.item.code) || '',
  unitName:
    ('lines' in line ? line.lines[0]?.item?.unitName : line.item?.unitName) ??
    '',
});

export const toItemWithPackSize = (
  line: ItemLike
): ItemWithPackSizeFragment => ({
  ...toItemRow(line),
  defaultPackSize: 1,
});

interface GenericStockItemSearchInputProps {
  currentItemId?: string | null;
  disabled?: boolean;
  width?: number;
  autoFocus?: boolean;
  openOnFocus?: boolean;
}

export interface StockItemSearchInputProps
  extends GenericStockItemSearchInputProps {
  onChange: (item: ItemStockOnHandFragment | null) => void;
  extraFilter?: (item: ItemStockOnHandFragment) => boolean;
  includeNonVisibleWithStockOnHand?: boolean;
}

export interface StockItemSearchInputWithStatsProps
  extends GenericStockItemSearchInputProps {
  onChange: (item: ItemRowWithStatsFragment | null) => void;
  extraFilter?: (item: ItemRowWithStatsFragment) => boolean;
}

export const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

export const itemFilterOptions = {
  stringify: (item: ItemStockOnHandFragment) => `${item.code} ${item.name}`,
};
