import React, { useState } from 'react';
import {
  Box,
  Breakpoints,
  Tab,
  TableContainer,
  PlusCircleIcon,
  useTranslation,
  TabContext,
  TabKeybindings,
  TabList,
  ButtonWithIcon,
  useAppTheme,
  useMediaQuery,
  Alert,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import { InboundLineEditPanel } from './InboundLineEditPanel';
import { QuantityTable, PricingTable, LocationTable } from './TabTables';
import {
  CurrencyRowFragment,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { PatchDraftLineInput } from '../../../api';

interface TabLayoutProps {
  addDraftLine: () => void;
  draftLines: DraftInboundLine[];
  isDisabled: boolean;
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  removeDraftLine: (id: string) => void;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  item: ItemRowFragment | null;
  hasItemVariantsEnabled?: boolean;
  hasVvmStatusesEnabled?: boolean;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Other = 'Other',
}

export const TabLayout = ({
  addDraftLine,
  draftLines,
  isDisabled,
  updateDraftLine,
  removeDraftLine,
  currency,
  isExternalSupplier,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
}: TabLayoutProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Batch);
  const [packRoundingMessage, setPackRoundingMessage] = useState<string>(
    () => ''
  );

  if (!item) return null;

  return (
    <TabContext value={currentTab}>
      <TabKeybindings
        tabs={[Tabs.Batch, Tabs.Pricing, Tabs.Other]}
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
              value={Tabs.Other}
              label={`${t('heading.other')} (Ctrl+3)`}
              tabIndex={-1}
            />
          </TabList>
        </Box>
        <Box flex={1} justifyContent="flex-end" display="flex">
          <ButtonWithIcon
            disabled={isDisabled}
            color="primary"
            variant="outlined"
            onClick={() => {
              addDraftLine();
              setPackRoundingMessage?.('');
            }}
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
          <Box width={'100%'}>
            {packRoundingMessage && (
              <Alert severity="warning" style={{ marginBottom: 2 }}>
                {packRoundingMessage}
              </Alert>
            )}
            <QuantityTable
              setPackRoundingMessage={setPackRoundingMessage}
              isDisabled={isDisabled}
              lines={draftLines}
              updateDraftLine={updateDraftLine}
              removeDraftLine={removeDraftLine}
              item={item}
              hasItemVariantsEnabled={hasItemVariantsEnabled}
              hasVvmStatusesEnabled={hasVvmStatusesEnabled}
            />
          </Box>
        </InboundLineEditPanel>

        <InboundLineEditPanel value={Tabs.Pricing}>
          <PricingTable
            isDisabled={isDisabled}
            lines={draftLines}
            updateDraftLine={updateDraftLine}
            currency={currency}
            isExternalSupplier={isExternalSupplier}
          />
        </InboundLineEditPanel>

        <InboundLineEditPanel value={Tabs.Other}>
          <LocationTable
            isDisabled={isDisabled}
            lines={draftLines}
            updateDraftLine={updateDraftLine}
            restrictedToLocationTypeId={item?.restrictedLocationTypeId}
          />
        </InboundLineEditPanel>
      </TableContainer>
    </TabContext>
  );
};
