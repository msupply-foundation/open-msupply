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
import { InboundItems } from './ImboundBatchedItems';

interface AccordionLayoutProps {
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

export const AccordionLayout = ({
  addDraftLine,
  draftLines,
  isDisabled,
  updateDraftLine,
  removeDraftLine,
  currency,
  isExternalSupplier,
  item,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
}:AccordionLayoutProps) => {
 const t = useTranslation();
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));
  const [packRoundingMessage, setPackRoundingMessage] = useState<string>(
    () => ''
  );

  if (!item) return null;
  return (
    <Box>
      <Box flex={1} display="flex" justifyContent="space-between">
        <Box flex={1} />
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

      {packRoundingMessage && (
        <Alert severity="warning" style={{ marginBottom: 2 }}>
          {packRoundingMessage}
        </Alert>
      )}

      <InboundItems
        lines={draftLines}
        updateDraftLine={updateDraftLine}
        removeDraftLine={removeDraftLine}
        isDisabled={isDisabled}
        item={item}
        hasItemVariantsEnabled={hasItemVariantsEnabled}
        hasVvmStatusesEnabled={hasVvmStatusesEnabled}
        setPackRoundingMessage={setPackRoundingMessage}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
        restrictedToLocationTypeId={item?.restrictedLocationTypeId}
      />
    </Box>
  );
};