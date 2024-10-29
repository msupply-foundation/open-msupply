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
} from '@openmsupply-client/common';
import { useItem } from '../api';
import { Toolbar } from './Toolbar';
import { GeneralTab } from './Tabs/General';
import { MasterListsTab } from './Tabs/MasterLists';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { usePackVariant } from '../context';
import { PackVariantsTab } from './Tabs/PackVariants';
import { ItemVariantsTab } from './Tabs/ItemVariants';

export const ItemDetailView: FC = () => {
  const { data, isLoading } = useItem();
  const navigate = useNavigate();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isCentralServer = useIsCentralServerApi();

  React.useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.name ?? '' });
  }, [data, setCustomBreadcrumbs]);

  const { variantsControl, numberOfPacksFromQuantity } = usePackVariant(
    data?.id ?? '',
    data?.name ?? null
  );
  if (isLoading || !data) return <DetailFormSkeleton />;

  const tabs = [
    {
      Component: <GeneralTab variantControl={variantsControl} />,
      value: t('label.general'),
    },
    {
      Component: <MasterListsTab itemId={data.id} />,
      value: t('label.master-lists'),
    },
  ];

  isCentralServer &&
    tabs.push({
      Component: (
        <ItemVariantsTab itemId={data.id} itemVariants={data.variants} />
      ),
      value: t('label.variants'),
    }),
    Environment.FEATURE_PACK_VARIANTS &&
      tabs.push({
        Component: <PackVariantsTab itemId={data.id} />,
        value: t('label.pack-variants'),
      });

  return !!data ? (
    <Box style={{ width: '100%' }}>
      <Toolbar numberOfPacksFromQuantity={numberOfPacksFromQuantity} />
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
