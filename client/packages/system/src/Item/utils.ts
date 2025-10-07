import { ItemLike } from './types';
import {
  ItemRowFragment,
  ItemStockOnHandFragment,
  ItemWithPackSizeFragment,
  PackagingVariantFragment,
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
  restrictedLocationTypeId:
    ('lines' in line
      ? line.lines[0]?.item.restrictedLocationTypeId
      : line.item.restrictedLocationTypeId) ?? null,
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
  // Some components passing currentItemId haven't actually loaded the full item
  // yet, so if this is true, we call `onChange` when the item is loaded
  // initially
  initialUpdate?: boolean;
}

export interface StockItemSearchInputProps
  extends GenericStockItemSearchInputProps {
  onChange: (item: ItemStockOnHandFragment | null) => void;
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
  filter: ItemFilterInput;
}

export const itemFilterOptions = {
  stringify: (item: ItemWithStatsFragment) => `${item.code} ${item.name}`,
};

export const getOptionLabel = <T extends { code: string; name: string }>(
  item: T
): string => `${item.code} ${item.name}`;

export const getVolumePerPackFromVariant = ({
  itemVariant,
  packSize,
}: {
  packSize?: number | null;
  itemVariant?: {
    packagingVariants: Pick<
      PackagingVariantFragment,
      'packSize' | 'volumePerUnit'
    >[];
  } | null;
}): number | undefined => {
  if (!itemVariant) return undefined;

  const packaging = itemVariant.packagingVariants.find(
    p => p.packSize === packSize
  );

  if (!packaging) return undefined;

  // Item variants save volume in L, but it is saved in m3 everywhere else
  return ((packaging?.volumePerUnit ?? 0) / 1000) * (packSize ?? 1);
};
