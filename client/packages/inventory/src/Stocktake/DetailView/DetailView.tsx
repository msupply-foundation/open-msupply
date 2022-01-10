import React, { FC } from 'react';
import {
  useParams,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useDocument,
  DataTable,
  usePagination,
  useTranslation,
  Box,
  Column,
  useDialog,
  DialogButton,
  useColumns,
  ColumnAlign,
  GenericColumnKey,
  Item,
} from '@openmsupply-client/common';
import { reducer, StocktakeActionCreator } from './reducer';
import { getStocktakeDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
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

export const toItem = (line: StocktakeItem): Item => ({
  // id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  // name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  // code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  // isVisible: true,
  // availableBatches: [],
  // availableQuantity: 0,
  // unitName: 'bottle',
  id: line.id,
  name: line.itemName(),
  code: line.itemCode(),
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  unitName: 'bottle',
});

export const DetailView: FC = () => {
  const [modalState, setModalState] = React.useState<{
    item: Item | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });
  const { draft, onChangeSortBy, sortBy } = useDraftStocktake();

  const onRowClick = (item: StocktakeItem) => {
    setModalState({ item: toItem(item), mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
    showDialog();
  };

  const onOK = () => {
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

      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const { pagination } = usePagination();
  const activeRows = draft.lines.filter(({ isDeleted }) => !isDeleted);

  const t = useTranslation('common');

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={onAddItem} />
      <Toolbar />
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
      <Footer />
      <SidePanel />

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
        <StocktakeLineEdit mode={modalState.mode} item={modalState.item} />
      </Modal>
    </TableProvider>
  );
};
