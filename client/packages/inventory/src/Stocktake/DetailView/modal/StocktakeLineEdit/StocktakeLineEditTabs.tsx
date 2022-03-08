import React, { useEffect, FC, useState } from 'react';
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
} from '@openmsupply-client/common';

export enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Location = 'Location',
}

export const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

export const StyledTabContainer = styled(Box)(() => ({
  height: 300,
  flexDirection: 'row',
  display: 'flex',
}));

export const StocktakeLineEditTabs: FC<{
  onAddLine: () => void;
  isDisabled: boolean;
}> = ({ children, onAddLine, isDisabled }) => {
  const t = useTranslation('inventory');
  const [currentTab, setCurrentTab] = useState(Tabs.Batch);

  useEffect(() => {
    const keybindings = (e: KeyboardEvent) => {
      if (e.code === 'Digit1' && e.shiftKey) {
        e.preventDefault();
        setCurrentTab(Tabs.Batch);
      }
      if (e.code === 'Digit2' && e.shiftKey) {
        e.preventDefault();
        setCurrentTab(Tabs.Pricing);
      }
      if (e.code === 'Digit3' && e.shiftKey) {
        e.preventDefault();
        setCurrentTab(Tabs.Location);
      }
    };

    window.addEventListener('keydown', keybindings);

    return () => window.removeEventListener('keydown', keybindings);
  }, []);

  return (
    <TabContext value={currentTab}>
      <Box flex={1} display="flex" justifyContent="space-between">
        <Box flex={1} />

        <TabList
          value={currentTab}
          centered
          onChange={(_, v) => setCurrentTab(v)}
        >
          <Tab value={Tabs.Batch} label={`${t('label.batch')} (⇧+1)`} />
          <Tab value={Tabs.Pricing} label={`${t('label.pricing')} (⇧+2)`} />
          <Tab value={Tabs.Location} label={`${t('label.location')} (⇧+3)`} />
        </TabList>
        <Box flex={1} justifyContent="flex-end" display="flex">
          <ButtonWithIcon
            disabled={isDisabled}
            color="primary"
            variant="outlined"
            onClick={onAddLine}
            label={t('label.add-batch', { ns: 'inventory' })}
            Icon={<PlusCircleIcon />}
          />
        </Box>
      </Box>
      {children}
    </TabContext>
  );
};
