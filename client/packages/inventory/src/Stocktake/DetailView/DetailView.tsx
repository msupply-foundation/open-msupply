import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useDocument,
  useColumns,
  GenericColumnKey,
  DataTable,
  usePagination,
  useTranslation,
  getRowExpandColumn,
  ColumnAlign,
  Box,
  Column,
  useDialog,
  DialogButton,
} from '@openmsupply-client/common';
import { reducer, StocktakeActionCreator } from './reducer';
import { getStocktakeDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { isStocktakeEditable } from '../../utils';
import { StocktakeItem } from '../../types';
import { StocktakeLineEdit } from './modal/StocktakeLineEdit/StocktakeLineEdit';

const useDraftStocktake = () => {
  const { id } = useParams();
  const { api } = useOmSupplyApi();

  const { draft, save, dispatch, state } = useDocument(
    ['stocktake', id],
    reducer,
    getStocktakeDetailViewApi(api)
  );

  const onChangeSortBy = (column: Column<StocktakeItem>) => {
    dispatch(StocktakeActionCreator.sortBy(column));
  };

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

const Expand: FC<{ rowData: StocktakeItem }> = ({ rowData }) => {
  return (
    <Box p={1} height={300} style={{ overflow: 'scroll' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        bgcolor="#c7c9d933"
      >
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(rowData, null, 2)}
        </span>
      </Box>
    </Box>
  );
};

export enum ModalMode {
  Create,
  Update,
}

export const DetailView: FC = () => {
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });
  const { draft, save, onChangeSortBy, sortBy } = useDraftStocktake();

  const onChangeItem = (item: StocktakeItem | null) => {
    setModalState(state => ({ ...state, item }));
  };

  const onRowClick = (item: StocktakeItem) => {
    setModalState({ item, mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
    showDialog();
  };

  const onOK = () => {
    // modalState.item && draft.upsertItem?.(modalState.item);
    hideDialog();
  };

  const columns = useColumns<StocktakeItem>(
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      {
        key: 'countedNumPacks',
        label: 'label.counted-num-of-packs',
        width: 150,
        align: ColumnAlign.Right,
      },
      {
        key: 'snapshotNumPacks',
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
      },

      getRowExpandColumn<StocktakeItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const { pagination } = usePagination();
  const activeRows = draft.lines.filter(({ isDeleted }) => !isDeleted);

  const t = useTranslation('common');

  const [modalState, setModalState] = React.useState<{
    item: StocktakeItem | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isStocktakeEditable(draft)}
        onAddItem={onAddItem}
      />
      <Toolbar draft={draft} />
      <DataTable
        onRowClick={onRowClick}
        ExpandContent={Expand}
        pagination={{ ...pagination, total: activeRows.length }}
        columns={columns}
        data={activeRows.slice(
          pagination.offset,
          pagination.offset + pagination.first
        )}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
      />
      <Footer draft={draft} save={save} />
      <SidePanel draft={draft} />

      <Modal
        title={
          modalState.mode === ModalMode.Create
            ? t('heading.add-item')
            : t('heading.edit-item')
        }
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        nextButton={
          <DialogButton
            variant="next"
            onClick={() => {}}
            disabled={modalState.mode === ModalMode.Update}
          />
        }
        okButton={<DialogButton variant="ok" onClick={onOK} />}
        height={600}
        width={1024}
      >
        <StocktakeLineEdit
          draft={draft}
          mode={modalState.mode}
          item={modalState.item}
          onChangeItem={onChangeItem}
        />
      </Modal>
    </TableProvider>
  );
};
