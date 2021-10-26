import React, { FC } from 'react';
import { useParams } from 'react-router';
import {
  AppBarButtonsPortal,
  BookIcon,
  Box,
  CircleIcon,
  ClockIcon,
  Column,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
  PlusCircleIcon,
  RewindIcon,
  TabContext,
  TabPanel,
  TableProvider,
  Typography,
  createTableStore,
  useColumns,
  useDetailPanel,
  useDocument,
  useFormatDate,
  useNotification,
  useTabs,
  useTranslation,
  InvoiceLine,
  ButtonWithIcon,
} from '@openmsupply-client/common';
import { reducer, OutboundAction } from './reducer';
import { getOutboundShipmentDetailViewApi } from '../../api';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemDetailsModal } from './modals/ItemDetailsModal';
import { ExternalURL } from '@openmsupply-client/config';
import { ActionType, ItemRow } from './types';
import { OutboundDetailToolbar } from './OutboundDetailToolbar';
import { getStatusTranslation, isInvoiceEditable } from '../utils';
import { OutboundDetailFooter } from './OutboundDetailFooter';

const useDraftOutbound = () => {
  const { id } = useParams();

  const { draft, save, dispatch, state } = useDocument(
    ['invoice', id ?? 'new'],
    reducer,
    getOutboundShipmentDetailViewApi(id ?? '')
  );

  const onChangeSortBy: (sortBy: Column<ItemRow>) => void = column => {
    dispatch(OutboundAction.onSortBy(column));
  };

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const OutboundShipmentDetailViewComponent: FC = () => {
  const { draft, dispatch, onChangeSortBy, save, sortBy } = useDraftOutbound();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const d = useFormatDate();
  const { success, warning } = useNotification();
  const [itemModalOpen, setItemModalOpen] = React.useState(false);
  const upsertInvoiceLine = (invoiceLine: InvoiceLine) => {
    dispatch({ type: ActionType.UpsertLine, payload: { invoiceLine } });
  };

  const entered = draft?.entryDatetime ? d(new Date(draft.entryDatetime)) : '-';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  const { currentTab, onChangeTab } = useTabs('general');

  const columns = useColumns<ItemRow>(
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'costPricePerPack',
      'sellPricePerPack',
      'packSize',
      'numberOfPacks',
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return draft ? (
    <TabContext value={String(currentTab)}>
      <AppBarButtonsPortal>
        <Grid container gap={1}>
          <ButtonWithIcon
            disabled={!isInvoiceEditable(draft)}
            labelKey="button.add-item"
            Icon={<PlusCircleIcon />}
            onClick={() => setItemModalOpen(true)}
          />
          <ButtonWithIcon
            Icon={<BookIcon />}
            labelKey="button.docs"
            onClick={() => (location.href = ExternalURL.PublicDocs)}
          />
          {OpenButton}
        </Grid>
      </AppBarButtonsPortal>
      <ItemDetailsModal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        upsertInvoiceLine={upsertInvoiceLine}
      />

      <OutboundDetailToolbar
        draft={draft}
        onChangeTab={(val: string) => onChangeTab(val)}
        currentTab={currentTab}
      />

      <Box display="flex" flex={1} flexDirection="column">
        <TabPanel sx={{ flex: 1, padding: 0, display: 'flex' }} value="general">
          <GeneralTab
            columns={columns}
            data={draft.lines ?? []}
            sortBy={sortBy}
          />
        </TabPanel>

        <TabPanel sx={{ flex: 1 }} value="transport">
          <Box sx={{ flex: 1, display: 'flex' }}>
            <span>Transport details coming soon..</span>
          </Box>
        </TabPanel>
        <OutboundDetailFooter draft={draft} save={save} />
      </Box>
      <DetailPanelPortal
        Actions={
          <>
            <DetailPanelAction
              icon={<ClockIcon />}
              titleKey="link.history"
              onClick={warning('No history available')}
            />
            <DetailPanelAction
              icon={<RewindIcon />}
              titleKey="link.backorders"
              onClick={warning('No back orders available')}
            />
            <DetailPanelAction
              icon={<CopyIcon />}
              titleKey="link.copy-to-clipboard"
              onClick={copyToClipboard}
            />
          </>
        }
      >
        <>
          <DetailPanelSection titleKey="heading.comment">
            <Typography key="comment">{draft?.comment}</Typography>
          </DetailPanelSection>
          <DetailPanelSection titleKey="heading.additional-info">
            <Grid container key="additional-info">
              <PanelRow>
                <PanelLabel>{t('label.color')}</PanelLabel>
                <PanelField>
                  <CircleIcon htmlColor={draft?.color} sx={{ width: 8 }} />
                  <span
                    style={{
                      color: draft?.color,
                      verticalAlign: 'bottom',
                      marginLeft: 5,
                    }}
                  >
                    {draft?.color}
                  </span>
                </PanelField>
              </PanelRow>
              <PanelRow>
                <PanelLabel>{t('label.entered')}</PanelLabel>
                <PanelField>{entered}</PanelField>
              </PanelRow>
              <PanelRow>
                <PanelLabel>{t('label.status')}</PanelLabel>
                <PanelField>
                  {t(getStatusTranslation(draft?.status))}
                </PanelField>
              </PanelRow>
            </Grid>
          </DetailPanelSection>
        </>
      </DetailPanelPortal>
    </TabContext>
  ) : null;
};

export const OutboundShipmentDetailView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <OutboundShipmentDetailViewComponent />
    </TableProvider>
  );
};
