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
} from '@openmsupply-client/common';
import { useItem } from '../api';
import { Toolbar } from './Toolbar';
import { GeneralTab } from './Tabs/General';
import { MasterListsTab } from './Tabs/MasterLists';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { usePackVariant } from '../context';
import { PackVariantsTab } from './Tabs/PackVariants';

export const ItemDetailView: FC = () => {
  const { data, isLoading } = useItem();
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setSuffix } = useBreadcrumbs();

  React.useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

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
      Component: <MasterListsTab />,
      value: t('label.master-lists'),
    },
  ];

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
