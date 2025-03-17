import { LocaleKey } from '@common/intl';
import { GenderType } from '@common/types';

export function getGenderTranslationKey(gender: GenderType): LocaleKey {
  switch (gender) {
    case GenderType.Female:
      return 'gender.female';
    case GenderType.Male:
      return 'gender.male';
    case GenderType.NonBinary:
      return 'gender.non-binary';
    case GenderType.Transgender:
      return 'gender.transgender';
    case GenderType.TransgenderFemale:
    case GenderType.TransgenderFemaleHormone:
    case GenderType.TransgenderFemaleSurgical:
      return 'gender.transgender-female';
    case GenderType.TransgenderMale:
    case GenderType.TransgenderMaleHormone:
    case GenderType.TransgenderMaleSurgical:
      return 'gender.transgender-male';
    case GenderType.Unknown:
      return 'gender.unknown';
  }
}
