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
import { AppRoute } from '@openmsupply-client/config';

export const ItemDetailView: FC = () => {
  const { data, isLoading } = useItem();
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setSuffix } = useBreadcrumbs();

  React.useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

  if (isLoading) return <DetailFormSkeleton />;

  const tabs = [
    {
      Component: <GeneralTab />,
      value: 'General',
    },
    {
      Component: <MasterListsTab />,
      value: 'Master Lists',
    },
  ];

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
