import React, { FC, useState } from 'react';
import { useIsMediumScreen } from '@common/hooks';
import {
  TabContext,
  TabKeybindings,
  TabList,
  ButtonWithIcon,
} from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import {
  Box,
  Tab,
  TableContainer,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import { InboundLineEditPanel } from './InboundLineEditPanel';
import { QuantityTable, PricingTable, LocationTable } from './TabTables';
import { InboundLineFragment } from '../../../api';

interface TabLayoutProps {
  addDraftLine: () => void;
  draftLines: DraftInboundLine[];
  isDisabled: boolean;
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void;
  item: InboundLineFragment['item'] | null;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Location = 'Location',
}

export const TabLayout: FC<TabLayoutProps> = ({
  item,
  addDraftLine,
  draftLines,
  isDisabled,
  updateDraftLine,
}) => {
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Batch);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation('replenishment');

  if (draftLines.length === 0)
    return <Box sx={{ height: isMediumScreen ? 400 : 500 }} />;

  return (
    <TabContext value={currentTab}>
      <TabKeybindings
        tabs={[Tabs.Batch, Tabs.Pricing, Tabs.Location]}
        onAdd={addDraftLine}
        setCurrentTab={setCurrentTab}
        dependencies={[draftLines]}
      />

      <Box flex={1} display="flex" justifyContent="space-between">
        <Box flex={1} />
        <Box flex={1}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => setCurrentTab(v)}
          >
            <Tab
              value={Tabs.Batch}
              label={`${t('label.quantities')} (Ctrl+1)`}
              tabIndex={-1}
            />
            <Tab
              value={Tabs.Pricing}
              label={`${t('label.pricing')} (Ctrl+2)`}
              tabIndex={-1}
            />
            <Tab
              value={Tabs.Location}
              label={`${t('label.location')} (Ctrl+3)`}
              tabIndex={-1}
            />
          </TabList>
        </Box>
        <Box flex={1} justifyContent="flex-end" display="flex">
          <ButtonWithIcon
            disabled={isDisabled}
            color="primary"
            variant="outlined"
            onClick={addDraftLine}
            label={`${t('label.add-batch')} (+)`}
            Icon={<PlusCircleIcon />}
          />
        </Box>
      </Box>
      <TableContainer
        sx={{
          height: isMediumScreen ? 300 : 400,
          marginTop: 2,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'divider',
          borderRadius: '20px',
        }}
      >
        <InboundLineEditPanel value={Tabs.Batch}>
          <QuantityTable
            item={item}
            isDisabled={isDisabled}
            lines={draftLines}
            updateDraftLine={updateDraftLine}
          />
        </InboundLineEditPanel>

        <InboundLineEditPanel value={Tabs.Pricing}>
          <PricingTable
            isDisabled={isDisabled}
            lines={draftLines}
            updateDraftLine={updateDraftLine}
          />
        </InboundLineEditPanel>

        <InboundLineEditPanel value={Tabs.Location}>
          <LocationTable
            isDisabled={isDisabled}
            lines={draftLines}
            updateDraftLine={updateDraftLine}
          />
        </InboundLineEditPanel>
      </TableContainer>
    </TabContext>
  );
};
