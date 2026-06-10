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
  buildPropertyColumns,
  useFormatDateTime,
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
  const { localisedDate } = useFormatDateTime();
  const { Modal, showDialog, hideDialog } = useDialog();
  const [selectedId, setSelectedId] = useState<string>('');

  const { data, isError, isFetching } = useName.document.list(type);
  const { data: properties } = useName.document.propertiesV2();

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
      ...buildPropertyColumns<NameRowFragment>(properties ?? [], localisedDate),
    ],
    [properties, localisedDate, t]
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
