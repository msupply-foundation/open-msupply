import React, { ReactElement, useMemo, useState } from 'react';
import {
  useDialog,
  DialogButton,
  Fade,
  useTranslation,
  useNavigate,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  PropertyTypeEnum,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { Details } from '../Details';
import { useName, NameRowFragment } from '../api';
import { NameRenderer } from '../Components';
import { Toolbar } from './Toolbar';

interface NameListProps {
  type: 'customer' | 'supplier';
}

export const NameListView = ({ type }: NameListProps): ReactElement => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { Modal, showDialog, hideDialog } = useDialog();
  const [selectedId, setSelectedId] = useState<string>('');

  // useNames needs to know which property ids are option-typed so it picks
  // valueOptionId vs valueText when translating URL params into the filter.
  const { data: propertyDefinitions } =
    useName.document.namePropertyDefinitions();
  const optionPropertyIds = useMemo(
    () =>
      new Set(
        (propertyDefinitions ?? [])
          .filter(p => p.type === PropertyTypeEnum.Option)
          .map(p => p.id)
      ),
    [propertyDefinitions]
  );

  const { data, isError, isFetching } = useName.document.list(
    type,
    optionPropertyIds
  );

  // One column per property definition attached to `name` (KDD option 1).
  // The accessor picks the matching `propertyValue` for the row and renders the
  // populated value column for the property's type. Option-typed properties
  // render the option's `name`; everything else falls back to the populated
  // typed column (text/number/real/date).
  const propertyColumns = useMemo(
    (): ColumnDef<NameRowFragment>[] =>
      (propertyDefinitions ?? []).map(prop => ({
        id: `property.${prop.id}`,
        header: prop.name,
        enableSorting: false,
        accessorFn: row => {
          const pv = row.propertyValues?.find(v => v.property.id === prop.id);
          if (!pv) return '';
          if (prop.type === PropertyTypeEnum.Option) return pv.option?.name ?? '';
          if (prop.type === PropertyTypeEnum.Text) return pv.valueText ?? '';
          if (prop.type === PropertyTypeEnum.Number)
            return pv.valueNumber ?? '';
          if (prop.type === PropertyTypeEnum.Real) return pv.valueReal ?? '';
          if (prop.type === PropertyTypeEnum.Date) return pv.valueDate ?? '';
          return '';
        },
      })),
    [propertyDefinitions]
  );

  const columns = useMemo(
    (): ColumnDef<NameRowFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
        Cell: ({ row }) => (
          <NameRenderer
            label={row.original.code}
            isStore={!!row.original.store}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
      },
      ...propertyColumns,
    ],
    [propertyColumns, t]
  );

  const Transition = React.forwardRef(
    (
      props: TransitionProps & {
        children: React.ReactElement;
      },
      ref: React.Ref<unknown>
    ) => <Fade ref={ref} {...props} timeout={800}></Fade>
  );

  const handleRowClick = (row: NameRowFragment): void => {
    if (type === 'supplier') return navigate(row.id);
    setSelectedId(row.id);
    showDialog();
  };

  const { table } = usePaginatedMaterialTable({
    tableId: 'name-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    enableRowSelection: false,
    onRowClick: handleRowClick,
  });

  return (
    <>
      <Toolbar />
      <MaterialTable table={table} />
      {type === 'customer' && (
        <Modal
          title=""
          okButton={<DialogButton variant="ok" onClick={hideDialog} />}
          slideAnimation={false}
          Transition={Transition}
          width={700}
        >
          <Details nameId={selectedId} />
        </Modal>
      )}
    </>
  );
};
