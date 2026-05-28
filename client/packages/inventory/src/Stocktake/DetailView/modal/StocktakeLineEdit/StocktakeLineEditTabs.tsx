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
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 0 0 0',
  // display:flex overrides the UA-stylesheet's [hidden]{display:none}.
  // Re-apply display:none for inactive panels so they don't share flex space
  // with the active panel and shrink it to 1/3 of the available height.
  '&[hidden]': { display: 'none' },
});

export const StyledTabContainer = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
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
    <Box
      sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <TabContext value={currentTab}>
        <TabKeybindings
          tabs={[Tabs.Batch, Tabs.Pricing, Tabs.Other]}
          onAdd={onAddLine}
          setCurrentTab={setCurrentTab}
        />
        <Box
          display="flex"
          justifyContent="space-between"
          sx={{ flexShrink: 0, pb: 0.5 }}
        >
          <Box flex={1} />

          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => setCurrentTab(v)}
          >
            <Tab value={Tabs.Batch} label={`${t('label.batch')} (Ctrl+1)`} />
            <Tab
              value={Tabs.Pricing}
              label={`${t('label.pricing')} (Ctrl+2)`}
            />
            <Tab value={Tabs.Other} label={`${t('heading.other')} (Ctrl+3)`} />
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
    </Box>
  );
};
