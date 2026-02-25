import React from 'react';
import {
  CardList,
  useTranslation,
  Breakpoints,
  useAppTheme,
  useMediaQuery,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import { PatchDraftLineInput } from '../../../api';
import { CurrencyRowFragment, ItemRowFragment } from '@openmsupply-client/system';
import { useInboundCardFieldDefs } from './useInboundCardFieldDefs';

interface CardViewProps {
  draftLines: DraftInboundLine[];
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  removeDraftLine: (id: string) => void;
  isDisabled: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  item: ItemRowFragment | null;
  hasItemVariantsEnabled?: boolean;
  hasVvmStatusesEnabled?: boolean;
}

export const CardView = ({
  draftLines,
  updateDraftLine,
  removeDraftLine,
  isDisabled,
}: CardViewProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));

  const fieldDefs = useInboundCardFieldDefs({
    updateDraftLine,
    isDisabled,
  });

  return (
    <CardList
      items={draftLines}
      fieldDefs={fieldDefs}
      disabled={isDisabled}
      onDelete={removeDraftLine}
      getCardLabel={(item, index) =>
        `${t('label.batch')} ${index + 1}${item.batch ? `: ${item.batch}` : ''}`
      }
      maxHeight={isMediumScreen ? 300 : 400}
    />
  );
};
