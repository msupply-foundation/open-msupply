import React, { FC, useCallback, useState } from 'react';
import {
  AppBarTabsPortal,
  TableProvider,
  createTableStore,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  TabContext,
  TabList,
  Box,
  Tab,
  DetailTab,
} from '@openmsupply-client/common';
import { toItemRow, ItemRowFragment } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { OutboundLineEdit } from './OutboundLineEdit';
import { OutboundItem } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useOutbound } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundLineFragment } from '../api/operations.generated';

enum Tabs {
  Details = 'Details',
  Log = 'Log',
}

export const DetailView: FC = () => {
  const isDisabled = useOutbound.utils.isDisabled();
  const { entity, mode, onOpen, onClose, isOpen } =
    useEditModal<ItemRowFragment>();
  const { data, isLoading } = useOutbound.document.get();
  const t = useTranslation('distribution');
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Details);
  const onRowClick = useCallback(
    (item: OutboundLineFragment | OutboundItem) => {
      onOpen(toItemRow(item));
    },
    [toItemRow, onOpen]
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<
            OutboundLineFragment | OutboundItem
          >({
            initialSortBy: {
              key: 'itemName',
            },
          })}
        >
          <AppBarButtons onAddItem={onOpen} />
          {isOpen && (
            <OutboundLineEdit
              item={entity}
              mode={mode}
              isOpen={isOpen}
              onClose={onClose}
            />
          )}

          <Toolbar />
          <TabContext value={currentTab}>
            <AppBarTabsPortal
              sx={{
                display: 'flex',
                flex: 1,
                marginBottom: 1,
                justifyContent: 'center',
              }}
            >
              <Box flex={1}>
                <TabList
                  value={currentTab}
                  centered
                  onChange={(_, v) => setCurrentTab(v)}
                >
                  <Tab
                    value={Tabs.Details}
                    label={t('label.details')}
                    tabIndex={-1}
                  />
                  <Tab value={Tabs.Log} label={t('label.log')} tabIndex={-1} />
                </TabList>
              </Box>
            </AppBarTabsPortal>
            <DetailTab value={Tabs.Details}>
              <ContentArea
                onRowClick={!isDisabled ? onRowClick : null}
                onAddItem={onOpen}
              />
            </DetailTab>
          </TabContext>

          <Footer />
          <SidePanel />
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.OutboundShipment)
                .build()
            )
          }
          title={t('error.shipment-not-found')}
          message={t('messages.click-to-return-to-shipments')}
        />
      )}
    </React.Suspense>
  );
};
