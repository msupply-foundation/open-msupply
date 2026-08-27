import { LocaleKey, GenderTypeNode } from '@openmsupply-client/common';
import { noOtherVariants } from '../types';

export function getGenderTranslationKey(gender: GenderTypeNode): LocaleKey {
  switch (gender) {
    case GenderTypeNode.Female:
      return 'gender.female';
    case GenderTypeNode.Male:
      return 'gender.male';
    case GenderTypeNode.NonBinary:
      return 'gender.non-binary';
    case GenderTypeNode.Transgender:
      return 'gender.transgender';
    case GenderTypeNode.TransgenderFemale:
    case GenderTypeNode.TransgenderFemaleHormone:
    case GenderTypeNode.TransgenderFemaleSurgical:
      return 'gender.transgender-female';
    case GenderTypeNode.TransgenderMale:
    case GenderTypeNode.TransgenderMaleHormone:
    case GenderTypeNode.TransgenderMaleSurgical:
      return 'gender.transgender-male';
    case GenderTypeNode.Unknown:
      return 'gender.unknown';

    default:
      return noOtherVariants(gender);
  }
}
