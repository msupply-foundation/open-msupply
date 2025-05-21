import { ItemLike } from './types';
import {
  ItemRowFragment,
  ItemStockOnHandFragment,
  ItemWithPackSizeFragment,
} from './api';
import { styled } from '@common/styles';
import { ItemFilterInput } from '@common/types';
import { ItemWithStatsFragment } from '..';

export const toItemRow = (line: ItemLike): ItemRowFragment => ({
  __typename: 'ItemNode',
  id: ('lines' in line ? line.lines[0]?.item.id : line.item.id) || '',
  name: ('lines' in line ? line.lines[0]?.item.name : line.item.name) || '',
  code: ('lines' in line ? line.lines[0]?.item.code : line.item.code) || '',
  unitName:
    ('lines' in line ? line.lines[0]?.item?.unitName : line.item?.unitName) ??
    '',
  isVaccine:
    ('lines' in line ? line.lines[0]?.item.isVaccine : line.item.isVaccine) ??
    false,
  doses: ('lines' in line ? line.lines[0]?.item.doses : line.item.doses) ?? 0,
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
  filter?: ItemFilterInput;
  itemCategoryName?: string;
  programId?: string;
}

export const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

export interface StockItemSearchInputWithStatsProps
  extends GenericStockItemSearchInputProps {
  onChange: (item: ItemWithStatsFragment | null) => void;
  extraFilter?: (item: ItemWithStatsFragment) => boolean;
}

export const itemFilterOptions = {
  stringify: (item: ItemWithStatsFragment) => `${item.code} ${item.name}`,
};
