import React, { FC, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  AppBarContentPortal,
  Circle,
  Clock,
  Copy,
  Field,
  Grid,
  Label,
  Rewind,
  Row,
  Typography,
  useDetailPanel,
  useFormatDate,
  useDialog,
  useNotification,
  useTranslation,
  Tab,
  TabList,
  TabPanel,
  useTabs,
  TabContext,
  createTableStore,
  TableProvider,
  AppBarButtonsPortal,
  Book,
  Button,
  PlusCircle,
  Box,
  useDraftDocument,
} from '@openmsupply-client/common';
import { reducer } from './reducer';
import { getOutboundShipmentDetailViewApi } from '../../api';
import { GeneralTab } from './tabs/GeneralTab';
import { ExternalURL } from '@openmsupply-client/config';
import { DialogButton } from '@openmsupply-client/common/src/ui/components/buttons/DialogButton';

const useDraftOutbound = () => {
  const { id } = useParams();

  const { draft, save } = useDraftDocument(
    ['transaction', id ?? 'new'],
    reducer,
    getOutboundShipmentDetailViewApi(id ?? '')
  );
  return { draft, save };
};

export const OutboundShipmentDetailViewComponent: FC = () => {
  const { draft } = useDraftOutbound();
  const { OpenButton, setActions, setSections } = useDetailPanel();
  const t = useTranslation();
  const d = useFormatDate();
  const { success, warning } = useNotification();
  const addItem = () => {
    console.info('item added 😉');
    hideDialog();
  };
  const addAnotherItem = () => {
    console.info('item added 😉');
  };
  const { hideDialog, showDialog, Modal } = useDialog({
    title: 'heading.add-item',
  });
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
  }, [draft?.comment, draft?.color, draft?.status]);

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
  }, []);

  const { currentTab, onChangeTab } = useTabs('general');

  return draft ? (
    <TabContext value={String(currentTab)}>
      <AppBarButtonsPortal>
        <Button
          labelKey="button.add-item"
          icon={<PlusCircle />}
          onClick={showDialog}
        />
        <Button
          shouldShrink
          icon={<Book />}
          labelKey="button.docs"
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
        {OpenButton}
      </AppBarButtonsPortal>

      <Modal
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        nextButton={<DialogButton variant="next" onClick={addAnotherItem} />}
        okButton={<DialogButton variant="ok" onClick={addItem} />}
      >
        <Typography>Some stuff goes in here</Typography>
      </Modal>

      <AppBarContentPortal
        sx={{ display: 'flex', flex: 1, justifyContent: 'center' }}
      >
        <TabList value={currentTab} onChange={onChangeTab}>
          <Tab value="general" label={t('label.general')} />
          <Tab value="transport" label={t('label.transport')} />
        </TabList>
      </AppBarContentPortal>

      <Box display="flex" flex={1}>
        <TabPanel sx={{ flex: 1, padding: 0, display: 'flex' }} value="general">
          <GeneralTab data={draft?.items ?? []} />
        </TabPanel>

        <TabPanel sx={{ flex: 1 }} value="transport">
          <Box sx={{ flex: 1, display: 'flex' }}>
            <span>Transport details coming soon..</span>
          </Box>
        </TabPanel>
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
