import React from 'react';
import {
  NumInputRow,
  SxProps,
  Theme,
  useIntlUtils,
  useTranslation,
  RepresentationValue,
  QuantityUtils,
  DisplayUtils,
  Representation,
  DosesOrUnitsCaption,
} from '@openmsupply-client/common';

interface ResponseNumInputRowProps {
  value: number;
  onChange?: (value?: number) => void;
  representation: RepresentationValue;
  defaultPackSize: number;
  dosesPerUnit?: number;
  isDosesEnabled?: boolean;
  endAdornmentOverride?: string;
  unitName?: string | null;
  label: string;
  disabled?: boolean;
  disabledOverride?: boolean;
  sx?: SxProps<Theme>;
  overrideDoseDisplay?: boolean;
  roundUp?: boolean;
}

export const ResponseNumInputRow = ({
  label,
  value,
  onChange,
  representation,
  defaultPackSize,
  dosesPerUnit = 1,
  endAdornmentOverride,
  disabled,
  disabledOverride,
  isDosesEnabled = false,
  overrideDoseDisplay,
  unitName,
  sx,
  roundUp,
}: ResponseNumInputRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const valueInUnitsOrPacks = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

  const endAdornment = DisplayUtils.useEndAdornment(
    t,
    getPlural,
    unitName || t('label.unit'),
    representation,
    valueInUnitsOrPacks,
    endAdornmentOverride
  );

  const handleChange = (newValue?: number) => {
    if (!onChange) return;

    if (newValue === undefined) {
      onChange(undefined);
      return;
    }

    if (representation === Representation.PACKS) {
      onChange(newValue * defaultPackSize);
    } else {
      onChange(newValue);
    }
  };

  const dosesCaption =
    isDosesEnabled && !!value && !overrideDoseDisplay ? (
      <DosesOrUnitsCaption value={value} dosesPerUnit={dosesPerUnit} />
    ) : null;

  return (
    <NumInputRow
      value={valueInUnitsOrPacks}
      onChange={handleChange}
      endAdornment={endAdornment}
      label={label}
      disabled={disabled}
      disabledOverride={disabledOverride}
      sx={sx}
      caption={dosesCaption}
      roundUp={roundUp}
    />
  );
};
