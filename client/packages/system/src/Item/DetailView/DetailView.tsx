import React, { FC } from 'react';
import {
  DetailFormSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  Box,
  TabContext,
  TabPanel,
  useTabs,
  useBreadcrumbs,
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
  const { currentTab, onChangeTab } = useTabs('general');
  const { setSuffix } = useBreadcrumbs();

  React.useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

  if (isLoading) return <DetailFormSkeleton />;

  return !!data ? (
    <Box style={{ width: '100%' }}>
      <TabContext value={currentTab}>
        <Toolbar currentTab={currentTab} onChangeTab={onChangeTab} />
        <Box display="flex" flex={1}>
          <TabPanel sx={{ flex: 1 }} value={'general'}>
            <GeneralTab />
          </TabPanel>
          <TabPanel sx={{ flex: 1 }} value={'master-lists'}>
            <MasterListsTab />
          </TabPanel>
        </Box>
      </TabContext>
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
