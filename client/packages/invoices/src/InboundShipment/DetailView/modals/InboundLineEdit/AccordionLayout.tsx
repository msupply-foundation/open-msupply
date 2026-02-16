import React, { useState } from 'react';
import {
  PlusCircleIcon,
  useTranslation,
  ButtonWithIcon,
  useAppTheme,
  useMediaQuery,
  Alert,
  Breakpoints,
  Box,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { PatchDraftLineInput } from '../../../api';
import { InboundItems } from './InboundBatchedItems';

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
}: AccordionLayoutProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.md));
  const [packRoundingMessage, setPackRoundingMessage] = useState<string>('');

  if (!item) return null;
  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="flex-end">
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
