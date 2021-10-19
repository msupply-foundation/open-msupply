import React, { FC, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  AppBarButtonsPortal,
  BookIcon,
  Box,
  CircleIcon,
  ClockIcon,
  Column,
  CopyIcon,
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
  getEditableQuantityColumn,
  useColumns,
  useDetailPanel,
  useDocument,
  useFormatDate,
  useNotification,
  useTabs,
  useTranslation,
  InvoiceLine,
  ButtonWithIcon,
  XCircleIcon,
  DownloadIcon,
  ArrowRightIcon,
} from '@openmsupply-client/common';
import { reducer, OutboundAction } from './reducer';
import { getOutboundShipmentDetailViewApi } from '../../api';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemDetailsModal } from './modals/ItemDetailsModal';
import { ExternalURL } from '@openmsupply-client/config';
import { ActionType, ItemRow } from './types';
import { OutboundShipmentDetailViewToolbar } from './OutboundShipmentDetailViewToolbar';

const useDraftOutbound = () => {
  const { id } = useParams();

  const { draft, save, dispatch, state } = useDocument(
    ['invoice', id ?? 'new'],
    reducer,
    getOutboundShipmentDetailViewApi(Number(id))
  );

  const onChangeSortBy: (sortBy: Column<ItemRow>) => void = column => {
    dispatch(OutboundAction.onSortBy(column));
  };

  return { draft, save, dispatch, onChangeSortBy, sortBy: state.sortBy };
};

export const OutboundShipmentDetailViewComponent: FC = () => {
  const { draft, dispatch, onChangeSortBy, save, sortBy } = useDraftOutbound();
  const { OpenButton, setActions, setSections } = useDetailPanel();
  const t = useTranslation();
  const d = useFormatDate();
  const { success, warning } = useNotification();
  const [itemModalOpen, setItemModalOpen] = React.useState(false);
  const upsertInvoiceLine = (invoiceLine: InvoiceLine) => {
    dispatch({ type: ActionType.UpsertLine, payload: { invoiceLine } });
  };

  const entered = draft?.entered ? d(new Date(draft.entered)) : '-';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  useEffect(() => {
    setSections([
      {
        titleKey: 'heading.comment',
        children: [<Typography key="comment">{draft?.comment}</Typography>],
      },
      {
        titleKey: 'heading.additional-info',
        children: [
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
              <PanelField>{draft?.status}</PanelField>
            </PanelRow>
          </Grid>,
        ],
      },
    ]);
    // clean up on unload: will hide the details panel
    return () => setSections([]);
  }, [draft?.comment, draft?.color, draft?.status]);

  useEffect(() => {
    setActions([
      {
        icon: <ClockIcon />,
        titleKey: 'link.history',
        onClick: warning('No history available'),
      },
      {
        icon: <RewindIcon />,
        titleKey: 'link.backorders',
        onClick: warning('No back orders available'),
      },
      {
        icon: <CopyIcon />,
        titleKey: 'link.copy-to-clipboard',
        onClick: copyToClipboard,
      },
    ]);

    return () => setActions([]);
  }, []);

  const { currentTab, onChangeTab } = useTabs('general');

  const columns = useColumns<ItemRow>(
    ['itemCode', 'itemName', 'expiry', getEditableQuantityColumn()],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  const navigate = useNavigate();

  return draft ? (
    <TabContext value={String(currentTab)}>
      <AppBarButtonsPortal>
        <Grid container gap={1}>
          <ButtonWithIcon
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

      <OutboundShipmentDetailViewToolbar
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
        <Box display="flex" alignItems="flex-end" height={40} marginRight={2}>
          <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
            <ButtonWithIcon
              Icon={<XCircleIcon />}
              labelKey="button.cancel"
              color="secondary"
              onClick={() => navigate(-1)}
            />
            <ButtonWithIcon
              Icon={<DownloadIcon />}
              labelKey="button.save"
              variant="contained"
              color="secondary"
              onClick={() => {
                success('Saved invoice! 🥳 ')();
                save(draft);
              }}
            />
            <ButtonWithIcon
              Icon={<ArrowRightIcon />}
              labelKey="button.save-and"
              labelProps={{ status: draft.status }}
              variant="contained"
              color="secondary"
              onClick={() => {
                success('Saved invoice! 🥳 ')();
                draft.update?.('status', 'finalised');
                save(draft);
              }}
            />
          </Box>
        </Box>
      </Box>
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
