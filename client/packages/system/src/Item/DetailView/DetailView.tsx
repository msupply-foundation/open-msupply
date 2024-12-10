import React, { FC } from 'react';
import {
  DetailFormSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  Box,
  useBreadcrumbs,
  DetailTabs,
  useIsCentralServerApi,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { ItemLedgerFragment, useItem } from '../api';
import { Toolbar } from './Toolbar';
import { GeneralTab } from './Tabs/General';
import { MasterListsTab } from './Tabs/MasterLists';
import { AppRoute } from '@openmsupply-client/config';
import { ItemVariantsTab } from './Tabs/ItemVariants';
import { ItemLedgerTab } from './Tabs/ItemLedger';

export const ItemDetailView: FC = () => {
  const { data, isLoading } = useItem();
  const navigate = useNavigate();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isCentralServer = useIsCentralServerApi();

  React.useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.name ?? '' });
  }, [data, setCustomBreadcrumbs]);

  if (isLoading || !data) return <DetailFormSkeleton />;

  const onLedgerRowClick = (ledger: ItemLedgerFragment) => {
    switch (ledger.invoiceType) {
      case InvoiceNodeType.InboundShipment:
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addPart(String(ledger.invoiceNumber))
            .build()
        );
        break;
      case InvoiceNodeType.SupplierReturn:
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.SupplierReturn)
            .addPart(String(ledger.invoiceNumber))
            .build()
        );
        break;
      case InvoiceNodeType.OutboundShipment:
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .addPart(String(ledger.invoiceNumber))
            .build()
        );
        break;
      case InvoiceNodeType.CustomerReturn:
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerReturn)
            .addPart(String(ledger.invoiceNumber))
            .build()
        );
        break;
      case InvoiceNodeType.Prescription:
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Prescription)
            .addPart(String(ledger.invoiceNumber))
            .build()
        );
        break;
      default:
        break;
    }
  };

  const tabs = [
    {
      Component: <GeneralTab />,
      value: t('label.general'),
    },
    {
      Component: <MasterListsTab itemId={data.id} />,
      value: t('label.master-lists'),
    },
    {
      Component: (
        <ItemLedgerTab itemId={data.id} onRowClick={onLedgerRowClick} />
      ),
      value: t('label.ledger'),
    },
  ];

  isCentralServer &&
    tabs.push({
      Component: (
        <ItemVariantsTab itemId={data.id} itemVariants={data.variants} />
      ),
      value: t('label.variants'),
    });

  return !!data ? (
    <Box style={{ width: '100%' }}>
      <Toolbar />
      <DetailTabs tabs={tabs} />
    </Box>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .build()
        )
      }
      title={t('error.item-not-found')}
      message={t('messages.click-to-return-to-item-list')}
    />
  );
};
