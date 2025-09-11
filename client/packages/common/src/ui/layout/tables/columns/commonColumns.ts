import { MRT_RowData } from 'material-react-table';
import { ColumnDef } from '../material-react-table';
import { LocaleKey, TypedTFunction } from '@common/intl';

export const getItemNameColumn = <T extends MRT_RowData>(
  t: TypedTFunction<LocaleKey>
): ColumnDef<T> => {
  return {
    id: 'itemName',
    accessorKey: 'itemName',
    header: t('label.name'),
    size: 400,
    filterVariant: 'text',
  };
};
