import React, { ReactElement, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useDialog,
  DialogButton,
  Fade,
  NothingHere,
  useUrlQueryParams,
  useTranslation,
  useNavigate,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { Details } from '../Details';
import { useName, NameRowFragment } from '../api';
import { NameRenderer } from '../Components';

interface NameListProps {
  type: 'customer' | 'supplier';
}

export const NameListView = ({ type }: NameListProps): ReactElement => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { Modal, showDialog, hideDialog } = useDialog();
  const [selectedId, setSelectedId] = useState<string>('');

  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useName.document.list(type);
  const pagination = { page, first, offset };

  const columns = useColumns<NameRowFragment>(
    [
      {
        key: 'code',
        label: 'label.code',
        Cell: ({ rowData }) => (
          <NameRenderer label={rowData.code} isStore={!!rowData.store} />
        ),
        width: 100,
      },
      'name',
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
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

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="name-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        onRowClick={handleRowClick}
        noDataElement={<NothingHere body={t('error.no-items-to-display')} />}
      />
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
    </TableProvider>
  );
};
