import React, { useState } from 'react';
import {
  Box,
  PlusCircleIcon,
  useTranslation,
  ButtonWithIcon,
  useAppTheme,
  useMediaQuery,
  Alert,
  Breakpoints,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
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
  item: DraftInboundLine['item'] | null;
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
  const isSmallScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.md));
  const [packRoundingMessage, setPackRoundingMessage] = useState<string>(
    () => ''
  );

  if (!item) return null;
  return (
    <Box sx={{ mt: 10 }}>
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
        isSmallScreen={isSmallScreen}
      />
    </Box>
  );
};