import React, { FC, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  AppBarContentPortal,
  Circle,
  Clock,
  Copy,
  DialogButton,
  PanelField,
  Grid,
  PanelLabel,
  Rewind,
  PanelRow,
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
  useForm,
  Item,
} from '@openmsupply-client/common';
import { reducer } from './reducer';
import { getOutboundShipmentDetailViewApi } from '../../api';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemDetails } from './modals/ItemDetails';
import { ExternalURL } from '@openmsupply-client/config';

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
  const {
    register,
    reset,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useForm();
  const addItemClose = (item: Item) => {
    addItem(item);
    hideDialog();
  };
  const addItem = (item: Item) => {
    // TODO: add to dataset and have the reducer add the fn
    draft?.items?.push({ ...item, updateQuantity: () => {} });
    reset();
  };
  const onSubmit = handleSubmit(addItemClose);
  const onOkNext = handleSubmit(addItem);
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
            <PanelRow>
              <PanelLabel>{t('label.color')}</PanelLabel>
              <PanelField>
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
        nextButton={
          <DialogButton variant="next" onClick={onOkNext} disabled={!isValid} />
        }
        okButton={
          <DialogButton variant="ok" onClick={onSubmit} disabled={!isValid} />
        }
        height={600}
        width={780}
      >
        <ItemDetails
          register={register}
          onSubmit={onSubmit}
          setValue={setValue}
        />
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
