import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumUtils,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';

interface OrderSectionProps {
  isSent?: boolean;
  isPacksEnabled?: boolean;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
}

export const OrderSection = ({
  isSent,
  isPacksEnabled,
  draft,
  update,
}: OrderSectionProps) => {
  const t = useTranslation();
  const [isPacks, setIsPacks] = useState(isPacksEnabled);

  const options = useMemo(() => {
    if (isPacksEnabled) {
      return [{ label: t('label.units'), value: 'units' }];
    }
    return [
      { label: t('label.units'), value: 'units' },
      { label: t('label.packs'), value: 'packs' },
    ];
  }, [isPacksEnabled, t]);

  const defaultOption = options.find(
    option => option.value === (isPacks ? 'packs' : 'units')
  );

  const calculatePackQuantity = (precision: number = 0): number => {
    return NumUtils.round(
      (draft?.requestedQuantity ?? 0) / (draft?.defaultPackSize ?? 1),
      precision
    );
  };

  const alternativeQuantityLabel = useMemo((): string => {
    if (isPacks)
      return t('label.order-count-units', {
        count: Math.ceil(draft?.requestedQuantity ?? 0),
      });
    return t('label.order-count-packs', { count: calculatePackQuantity() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPacks, draft?.requestedQuantity]);

  const currentValue = useMemo(() => {
    if (isPacks) {
      return calculatePackQuantity(2);
    }
    return Math.ceil(draft?.requestedQuantity ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPacks, draft?.requestedQuantity, draft?.defaultPackSize]);

  const handleValueChange = (value?: number) => {
    const newValue = isNaN(Number(value)) ? 0 : (value ?? 0);

    const requestedQuantity = isPacks
      ? newValue * (draft?.defaultPackSize ?? 0)
      : newValue;

    if (draft?.suggestedQuantity === requestedQuantity) {
      update({
        requestedQuantity,
        reason: null,
      });
    } else {
      update({ requestedQuantity });
    }
  };

  return (
    <Box display="flex" flexDirection="column">
      <Box gap={1} display="flex" flexDirection="row">
        <InputWithLabelRow
          label={t('label.number')}
          Input={
            <NumericTextInput
              width={150}
              value={currentValue}
              disabled={isSent}
              onChange={handleValueChange}
              sx={{
                py: '3px',
                '& .MuiInputBase-input': {
                  p: '3px 4px',
                  backgroundColor: theme => theme.palette.background.white,
                },
              }}
            />
          }
          sx={{
            gap: 0,
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        />
        <InputWithLabelRow
          label={t('label.of')}
          Input={
            <Autocomplete
              width="150px"
              clearable={false}
              options={options}
              value={defaultOption}
              onChange={() => setIsPacks(!isPacks)}
              getOptionLabel={option => option.label}
              textSx={{ borderRadius: 2 }}
            />
          }
          sx={{
            gap: 0,
            flexDirection: 'column',
            alignItems: 'flex-start',
            '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 },
          }}
        />
        <Typography
          sx={{
            pt: 4,
          }}
        >
          {t('label.in-unit-name', {
            unitName: draft?.unitName,
            count: currentValue,
          })}
        </Typography>
      </Box>
      {isPacksEnabled && (
        <Typography variant="body2" color="text.secondary">
          {alternativeQuantityLabel}
        </Typography>
      )}
    </Box>
  );
};
