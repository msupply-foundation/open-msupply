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
      () => {
        if (endAdornmentOverride) return endAdornmentOverride;
        switch (representation) {
          case Representation.PACKS:
            return getPlural(t('label.pack').toLowerCase(), valueInUnitsOrPacks);
          case Representation.DOSES:
            return getPlural(t('label.dose').toLowerCase(), valueInUnitsOrPacks);
          default:
            return getPlural(unitName.toLowerCase(), valueInUnitsOrPacks);
        }
      },
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
