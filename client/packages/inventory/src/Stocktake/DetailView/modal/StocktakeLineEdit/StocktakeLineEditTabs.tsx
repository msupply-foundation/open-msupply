import React, { FC, PropsWithChildren, useState } from 'react';
import {
  TabContext,
  TabList,
  Tab,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  styled,
  TabPanel,
  TabKeybindings,
} from '@openmsupply-client/common';

export enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Other = 'Other',
}

export const StyledTabPanel = styled(TabPanel)({
  height: '100%',
  padding: '16px 0 0 0',
});

export const StyledTabContainer = styled(Box)(() => ({
  height: 325,
  flexDirection: 'row',
  display: 'flex',
}));

export const StocktakeLineEditTabs: FC<
  PropsWithChildren<{
    onAddLine: () => void;
    isDisabled: boolean;
  }>
> = ({ children, onAddLine, isDisabled }) => {
  const t = useTranslation();
  const [currentTab, setCurrentTab] = useState(Tabs.Batch);

  return (
    <TabContext value={currentTab}>
      <TabKeybindings
        tabs={[Tabs.Batch, Tabs.Pricing, Tabs.Other]}
        onAdd={onAddLine}
        setCurrentTab={setCurrentTab}
      />
      <Box flex={1} display="flex" justifyContent="space-between">
        <Box flex={1} />

        <TabList
          value={currentTab}
          centered
          onChange={(_, v) => setCurrentTab(v)}
        >
          <Tab
            data-shortcut="Ctrl+1"
            value={Tabs.Batch}
            label={t('label.batch')}
          />
          <Tab
            data-shortcut="Ctrl+2"
            value={Tabs.Pricing}
            label={t('label.pricing')}
          />
          <Tab
            data-shortcut="Ctrl+3"
            value={Tabs.Other}
            label={t('heading.other')}
          />
        </TabList>
        <Box flex={1} justifyContent="flex-end" display="flex">
          <ButtonWithIcon
            disabled={isDisabled}
            color="primary"
            variant="outlined"
            onClick={onAddLine}
            label={`${t('label.add-batch')} (+)`}
            Icon={<PlusCircleIcon />}
          />
        </Box>
      </Box>
      {children}
    </TabContext>
  );
};
