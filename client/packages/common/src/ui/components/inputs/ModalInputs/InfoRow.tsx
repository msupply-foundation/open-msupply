import React from 'react';
import {
  DosesOrUnitsCaption,
  Grid,
  NumericTextDisplay,
  QuantityUtils,
  DisplayUtils,
  Representation,
  RepresentationValue,
  SxProps,
  Theme,
  Typography,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';

interface InfoRowProps {
  label: string;
  value?: number | string | null;
  packagingDisplay?: string;
  sx?: SxProps<Theme>;
  decimalLimit?: number;
  caption?: React.ReactNode;
  roundUp?: boolean;
}

export const InfoRow = ({
  label,
  value,
  packagingDisplay,
  sx,
  decimalLimit,
  caption,
  roundUp = false,
}: InfoRowProps) => {
  return (
    <Grid
      container
      spacing={1}
      marginBottom={1}
      pl={1}
      pr={1.5}
      borderRadius={2}
      sx={sx}
    >
      <Grid size={8}>
        <Typography variant="body1" fontWeight={700}>
          {label}:
        </Typography>
      </Grid>
      <Grid
        size={4}
        display="flex"
        flexDirection="column"
        alignItems="flex-end"
      >
        {typeof value === 'number' ? (
          <>
            <NumericTextDisplay
              value={value}
              packagingDisplay={packagingDisplay}
              decimalLimit={decimalLimit}
              roundUp={roundUp}
            />
            {caption}
          </>
        ) : (
          <Typography variant="body1">
            {value} {packagingDisplay}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
};

interface ValueInfoRowProps extends Omit<InfoRowProps, 'value'> {
  value?: number | null;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName: string;
  nullDisplay?: string;
  endAdornmentOverride?: string;
  isDosesEnabled?: boolean;
  dosesPerUnit?: number;
  roundUp?: boolean;
  /** Display only the saved row value — for non-stock values like days or months */
  isFixedValue?: boolean;
}

export type ValueInfo = {
  label: string;
  endAdornmentOverride?: string;
  value?: number | null;
  sx?: SxProps<Theme>;
  isDosesEnabled?: boolean;
  roundUp?: boolean;
  isFixedValue?: boolean;
};

export const ValueInfoRow = ({
  label,
  value,
  representation,
  defaultPackSize,
  unitName,
  sx,
  endAdornmentOverride,
  isDosesEnabled = false,
  dosesPerUnit = 1,
  nullDisplay,
  decimalLimit,
  roundUp,
  isFixedValue = false,
}: ValueInfoRowProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  let valueInRepresentation;
  if (isFixedValue) {
    valueInRepresentation = value ?? 0;
  } else if (representation === Representation.DOSES) {
    valueInRepresentation = QuantityUtils.calculateValueInDoses(
      dosesPerUnit,
      value
    );
  } else {
    valueInRepresentation = QuantityUtils.calculateValueInUnitsOrPacks(
      representation,
      defaultPackSize,
      value
    );
  }

  const endAdornment = DisplayUtils.useEndAdornment(
    t,
    getPlural,
    unitName,
    representation,
    valueInRepresentation,
    endAdornmentOverride
  );

  const treatAsNull = value === null && nullDisplay;

  const displayValue = treatAsNull ? nullDisplay : valueInRepresentation;

  const caption =
    isDosesEnabled && !!value && !isFixedValue ? (
      <DosesOrUnitsCaption
        value={value}
        dosesPerUnit={dosesPerUnit}
        dosesSelected={representation === Representation.DOSES}
        unitsLabel={unitName}
        sx={{ pr: 0 }}
      />
    ) : null;

  return (
    <>
      <InfoRow
        label={label}
        value={displayValue}
        packagingDisplay={treatAsNull ? '' : endAdornment}
        sx={sx}
        decimalLimit={decimalLimit}
        caption={caption}
        roundUp={roundUp}
      />
    </>
  );
};
