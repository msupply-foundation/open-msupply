import React, { useMemo } from 'react';
import {
  NumInputRow,
  SxProps,
  Theme,
  useFormatNumber,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import {
  calculateValueInDoses,
  RepresentationValue,
  useEndAdornment,
  useValueInUnitsOrPacks,
} from 'packages/requisitions/src/common/utils';

interface ResponseNumInputRowProps {
  value: number;
  onChange?: (value?: number) => void;
  representation: RepresentationValue;
  defaultPackSize: number;
  dosesPerUnit?: number;
  displayVaccinesInDoses?: boolean;
  endAdornmentOverride?: string;
  unitName?: string | null;
  label: string;
  disabledOverride?: boolean;
  sx?: SxProps<Theme>;
  overrideDoseDisplay?: boolean;
}

export const ResponseNumInputRow = ({
  label,
  value,
  onChange,
  representation,
  defaultPackSize,
  dosesPerUnit = 1,
  endAdornmentOverride,
  disabledOverride,
  displayVaccinesInDoses = false,
  overrideDoseDisplay,
  unitName,
  sx,
}: ResponseNumInputRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();

  const valueInUnitsOrPacks = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    value
  );

  const endAdornment = useEndAdornment(
    t,
    getPlural,
    unitName || t('label.unit'),
    representation,
    valueInUnitsOrPacks,
    endAdornmentOverride
  );

  // doses always rounded to display in whole numbers
  const valueInDoses = useMemo(
    () =>
      displayVaccinesInDoses
        ? round(
            calculateValueInDoses(
              representation,
              defaultPackSize,
              dosesPerUnit,
              valueInUnitsOrPacks
            )
          )
        : undefined,
    [
      displayVaccinesInDoses,
      representation,
      defaultPackSize,
      dosesPerUnit,
      valueInUnitsOrPacks,
    ]
  );

  return (
    <NumInputRow
      value={valueInUnitsOrPacks}
      onChange={onChange}
      displayVaccinesInDoses={overrideDoseDisplay ?? displayVaccinesInDoses}
      dosesPerUnit={dosesPerUnit}
      endAdornment={endAdornment}
      valueInDoses={valueInDoses}
      label={label}
      disabledOverride={disabledOverride}
      sx={sx}
    />
  );
};
