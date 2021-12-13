import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  useQuery,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  useColumns,
  GenericColumnKey,
  getNotePopoverColumn,
  getRowExpandColumn,
  useDialog,
  DialogButton,
  useTranslation,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';

import { getInboundShipmentDetailViewApi } from './api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { GeneralTab } from './GeneralTab';
import { InboundLineEdit } from './modals/InboundLineEdit/InboundLineEdit';
import { inboundLinesToSummaryItems } from './reducer/reducer';
import {
  getNextInboundStatus,
  isInboundEditable,
  placeholderInbound,
} from '../../utils';
import {
  InboundShipmentItem,
  InboundShipment,
  Invoice,
  OutboundShipmentSummaryItem,
} from '../../types';

const useDraftInbound = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { api } = useOmSupplyApi();
  const queries = getInboundShipmentDetailViewApi(api);

  const onChangeSortBy = () => {};

  const { data } = useQuery(['invoice', id], () => {
    return queries.onRead(id);
  });

  const draft = data
    ? { ...data, items: inboundLinesToSummaryItems(data?.lines ?? []) }
    : placeholderInbound;

  const { mutateAsync } = useMutation(queries.onUpdate, {
    onMutate: async (patch: Partial<InboundShipment>) => {
      await queryClient.cancelQueries(['invoice', id]);

      const previousInbound: Invoice = queryClient.getQueryData([
        'invoice',
        id,
      ]);

      queryClient.setQueryData(['invoice', id], {
        ...previousInbound,
        ...patch,
      });

      return { previousInbound, patch };
    },
    onSettled: () => queryClient.invalidateQueries(['invoice', id]),
    onError: (_, __, context) => {
      queryClient.setQueryData(['invoice', id], context.previousInbound);
    },
  });

  const { isLoading: isAddingItem, mutateAsync: noOptimisticMutate } =
    useMutation(queries.onUpdate, {
      onSettled: () => queryClient.invalidateQueries(['invoice', id]),
    });

  const updateInvoice = async (patch: Partial<InboundShipment>) => {
    return mutateAsync({ ...data, ...patch, items: [] });
  };

  const upsertItem = async (item: OutboundShipmentSummaryItem) => {
    const itemIdx = draft.items.findIndex(i => i.id === item.id);
    if (itemIdx >= 0) draft.items[itemIdx] = item;
    else draft.items.push(item);

    // throw new Error('testing!');
    const result = await noOptimisticMutate(draft);

    return result;
  };

  return {
    isAddingItem,
    updateInvoice,
    upsertItem,
    draft:
      { ...data, items: inboundLinesToSummaryItems(data?.lines ?? []) } ??
      placeholderInbound,

    onChangeSortBy,
  };
};

export enum ModalMode {
  Create,
  Update,
}

export const DetailView: FC = () => {
  const t = useTranslation('distribution');

  const {
    draft,

    onChangeSortBy,

    updateInvoice,
    upsertItem,
    isAddingItem,
  } = useDraftInbound();

  const [modalState, setModalState] = React.useState<{
    item: InboundShipmentItem | null;
    mode: ModalMode;
  }>({ item: null, mode: ModalMode.Create });
  const { hideDialog, showDialog, Modal } = useDialog({
    onClose: () => setModalState({ item: null, mode: ModalMode.Create }),
  });

  const onChangeItem = (item: InboundShipmentItem | null) => {
    setModalState(state => ({ ...state, item }));
  };

  const onRowClick = (item: InboundShipmentItem) => {
    setModalState({ item, mode: ModalMode.Update });
    showDialog();
  };

  const onAddItem = () => {
    setModalState({ item: null, mode: ModalMode.Create });
    showDialog();
  };

  const onOK = async () => {
    await (modalState.item && upsertItem(modalState.item));

    hideDialog();
  };

  const columns = useColumns(
    [
      getNotePopoverColumn<InboundShipmentItem>(),
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationName',
      'sellPricePerPack',
      'packSize',
      'itemUnit',
      'unitQuantity',
      'numberOfPacks',
      getRowExpandColumn<InboundShipmentItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy },
    []
  );

  return (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!isInboundEditable(draft)}
        onAddItem={onAddItem}
      />

      <Toolbar draft={draft} update={updateInvoice} />

      <GeneralTab
        columns={columns}
        data={draft.items}
        onRowClick={onRowClick}
      />

      <Footer
        draft={draft}
        save={async () => {
          updateInvoice({ status: getNextInboundStatus(draft?.status) });
        }}
      />
      <SidePanel draft={draft} update={updateInvoice} />

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
            onClick={async () => {
              try {
                await (modalState.item && upsertItem(modalState.item));
                return setModalState({ mode: ModalMode.Create, item: null });
              } catch (e) {
                return false;
              }
            }}
            disabled={
              modalState.mode === ModalMode.Update && draft.items.length === 3
            }
          />
        }
        okButton={<DialogButton variant="ok" onClick={onOK} />}
        height={600}
        width={1024}
      >
        <InboundLineEdit
          loading={isAddingItem}
          draft={draft}
          mode={modalState.mode}
          item={modalState.item}
          onChangeItem={onChangeItem}
        />
      </Modal>
    </TableProvider>
  );
};
