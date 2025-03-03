import React, { useState } from 'react';
import { useTranslation } from '@common/intl';
import {
  Grid,
  InputLabel,
  NumericTextInput,
  useAuthContext,
  useDebounceCallback,
} from '@openmsupply-client/common';

interface IssueQuantitiesProps {
  disabled: boolean;
  unitName?: string;
  onAllocate: (quantity: number, prescribedQuantity: number | null) => number;
}

export const IssueQuantities = ({
  disabled,
  unitName,
  onAllocate,
}: IssueQuantitiesProps) => {
  const t = useTranslation();
  const { store: { preferences } = {} } = useAuthContext();

  const [issueUnitQuantity, setIssueUnitQuantity] = useState(0);
  // todo - get from lines?
  const [prescribedQuantity, setPrescribedQuantity] = useState<number>();

  // todo - debounce
  const debouncedAllocate = useDebounceCallback(
    (quantity: number, prescribedQuantity?: number) => {
      // only trigger allocation if the quantity has changed
      if (quantity === issueUnitQuantity) return;

      const allocated = onAllocate(quantity, prescribedQuantity ?? null);
      setIssueUnitQuantity(allocated);
    },
    [],
    500
  );

  const handleQuantityChange = (
    inputUnitQuantity?: number,
    type: 'issue' | 'prescribed' = 'issue'
  ) => {
    const quantity = inputUnitQuantity ?? 0;

    setIssueUnitQuantity(quantity);

    if (type === 'prescribed') {
      setPrescribedQuantity(quantity);
      debouncedAllocate(quantity, quantity);
    } else {
      debouncedAllocate(quantity, prescribedQuantity);
    }
  };

  return (
    <Grid
      container
      alignItems="center"
      display="flex"
      flexDirection="row"
      gap={5}
    >
      {preferences?.editPrescribedQuantityOnPrescription && (
        <Grid display="flex" alignItems="center" gap={1}>
          <InputLabel sx={{ fontSize: 12 }}>
            {t('label.prescribed-quantity')}
          </InputLabel>
          <NumericTextInput
            value={prescribedQuantity}
            onChange={quan => handleQuantityChange(quan, 'prescribed')}
            autoFocus
            disabled={disabled}
            {...numberInputProps}
          />
        </Grid>
      )}

      <Grid display="flex" alignItems="center" gap={1}>
        <InputLabel sx={{ fontSize: 12 }}>{t('label.issue')}</InputLabel>
        <NumericTextInput
          value={issueUnitQuantity}
          onChange={handleQuantityChange}
          autoFocus={!preferences?.editPrescribedQuantityOnPrescription}
          disabled={disabled}
          {...numberInputProps}
        />
        <InputLabel sx={{ fontSize: 12 }}>
          {t('label.unit-plural', {
            count: issueUnitQuantity,
            unit: unitName,
          })}
        </InputLabel>
      </Grid>
    </Grid>
  );
};

const numberInputProps = {
  min: 0,
  decimalLimit: 2,
  slotProps: {
    htmlInput: {
      sx: {
        backgroundColor: 'background.white',
      },
    },
  },
};
