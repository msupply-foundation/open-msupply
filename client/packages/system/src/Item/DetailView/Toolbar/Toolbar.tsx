import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  Tab,
  TabList,
} from '@openmsupply-client/common';
import { useItemFields } from '../../api';

interface ToolbarProps {
  currentTab: string;
  onChangeTab: (newTab: string) => void;
}

export const Toolbar: FC<ToolbarProps> = ({ currentTab, onChangeTab }) => {
  const t = useTranslation('catalogue');

  const { code, name } = useItemFields();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container flexDirection="column">
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('label.name')}
            Input={
              <BufferedTextInput
                disabled={true}
                size="small"
                sx={{ width: 250 }}
                value={name}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.code')}
            Input={
              <BufferedTextInput
                disabled={true}
                size="small"
                sx={{ width: 250 }}
                value={code}
              />
            }
          />
        </Grid>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => onChangeTab(v)}
          >
            <Tab value="general" label={t('tab.general')} />
            <Tab value="master-lists" label={t('tab.master-lists')} />
          </TabList>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
