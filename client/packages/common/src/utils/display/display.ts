import { useMemo } from 'react';
import { LocaleKey, TypedTFunction } from '@common/intl';
import { Representation, RepresentationValue } from '../quantities';

export const DisplayUtils = {
  useEndAdornment: (
    t: TypedTFunction<LocaleKey>,
    getPlural: (word: string, value: number) => string,
    unitName: string,
    representation: RepresentationValue,
    valueInUnitsOrPacks: number,
    endAdornmentOverride?: string
  ) =>
    useMemo(
      () =>
        endAdornmentOverride ??
        (representation === Representation.PACKS
          ? getPlural(t('label.pack').toLowerCase(), valueInUnitsOrPacks)
          : representation === Representation.DOSES
            ? getPlural(t('label.dose').toLowerCase(), valueInUnitsOrPacks)
            : getPlural(unitName.toLowerCase(), valueInUnitsOrPacks)),
      [
        t,
        getPlural,
        unitName,
        representation,
        endAdornmentOverride,
        valueInUnitsOrPacks,
      ]
    ),
};
