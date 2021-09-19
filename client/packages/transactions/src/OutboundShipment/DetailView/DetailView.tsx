import React, { FC, useEffect } from 'react';

import { useNavigate, useParams } from 'react-router';

import {
  AppBarContentPortal,
  Circle,
  Clock,
  Copy,
  Field,
  Grid,
  Label,
  Portal,
  Rewind,
  Row,
  Transaction,
  Typography,
  useDetailPanel,
  useFormatDate,
  useHostContext,
  useNotification,
  useQueryClient,
  useTranslation,
  Tab,
  TabList,
  TabPanel,
  useTabs,
  TabContext,
} from '@openmsupply-client/common';

import { detailQueryFn, updateFn } from '../../api';
import { createDraftStore, useDraftDocument } from '../../useDraftDocument';
import { Box } from '@material-ui/system';
import { GeneralTab } from './tabs/GeneralTab';

const placeholderTransaction: Transaction = {
  name: '',
  total: '',
  comment: '',
  color: 'grey',
  status: '',
  type: '',
  entered: '',
  confirmed: '',
  invoiceNumber: '',
};

const useDraft = createDraftStore<Transaction>();

const useDraftOutbound = (id: string) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { draft, setDraft, save } = useDraftDocument(
    ['transaction', id],
    detailQueryFn(id ?? ''),
    updateFn,

    // On successfully saving the draft, check if we had just saved a new
    // record - this is indicated by the record having no `id` field.
    // If there was an id field, we would be updating rather than creating.
    // If we did just save a newly created record, replace the current
    // url with the new id of the record. For example, if we are creating
    // an outbound shipment, we would start with the URL:
    // outbound-shipment/new
    // and once saved, we replace the url with the new invoice number
    // outbound-shipment/{invoice_number}
    // This will cause the query key to update, and everything from this
    // point is exactly the same as when editing an existing invoice.
    (data, variables) => {
      if (!variables.id) {
        navigate({ pathname: `../${data.id}` }, { replace: true });
      }

      queryClient.invalidateQueries('transaction');
    },
    useDraft,
    id === 'new' ? placeholderTransaction : undefined
  );

  return { draft, setDraft, save };
};

export const OutboundShipmentDetailView: FC = () => {
  const { id } = useParams();
  const { draft } = useDraftOutbound(id ?? 'new');
  const { appBarButtonsRef } = useHostContext();
  const { OpenButton, setActions, setSections } = useDetailPanel();
  const t = useTranslation();
  const d = useFormatDate();
  const { success, warning } = useNotification();
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
            <Row>
              <Label>{t('label.color')}</Label>
              <Field>
                <Circle htmlColor={draft?.color} sx={{ width: 8 }} />
                <span
                  style={{
                    color: draft?.color,
                    verticalAlign: 'bottom',
                    marginLeft: 5,
                  }}
                >
                  {draft?.color}
                </span>
              </Field>
            </Row>
            <Row>
              <Label>{t('label.entered')}</Label>
              <Field>{entered}</Field>
            </Row>
            <Row>
              <Label>{t('label.status')}</Label>
              <Field>{draft?.status}</Field>
            </Row>
          </Grid>,
        ],
      },
    ]);
    // clean up on unload: will hide the details panel
    return () => setSections([]);
  }, [draft]);

  useEffect(() => {
    setActions([
      {
        icon: <Clock />,
        titleKey: 'link.history',
        onClick: warning('No history available'),
      },
      {
        icon: <Rewind />,
        titleKey: 'link.backorders',
        onClick: warning('No back orders available'),
      },
      {
        icon: <Copy />,
        titleKey: 'link.copy-to-clipboard',
        onClick: copyToClipboard,
      },
    ]);

    return () => setActions([]);
  }, [draft]);

  const { currentTab, onChangeTab } = useTabs('general');

  return draft ? (
    <TabContext value={String(currentTab)}>
      <Portal container={appBarButtonsRef?.current}>{OpenButton}</Portal>

      <AppBarContentPortal
        sx={{ display: 'flex', flex: 1, justifyContent: 'center' }}
      >
        <TabList value={currentTab} onChange={onChangeTab}>
          <Tab value="general" label={t('label.general')} />
          <Tab value="transport" label={t('label.transport')} />
        </TabList>
      </AppBarContentPortal>

      <Box display="flex" flex={1}>
        <TabPanel sx={{ flex: 1, padding: 0 }} value="general">
          <GeneralTab data={draft?.items ?? []} />
        </TabPanel>

        <TabPanel sx={{ flex: 1 }} value="transport">
          <Box sx={{ flex: 1, display: 'flex' }}>
            <span>Price details coming soon..</span>
          </Box>
        </TabPanel>
      </Box>
    </TabContext>
  ) : null;
};
