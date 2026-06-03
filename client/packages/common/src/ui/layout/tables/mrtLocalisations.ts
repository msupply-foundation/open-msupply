// MRT locale lookup — kept here (out of common's intl utils) so the
// ~17KB of material-react-table/locales/* doesn't ship with the
// federation-shared common bundle. Only loaded when tables themselves
// load (via @common/tables).
import { MRT_Localization_AR } from 'material-react-table/locales/ar';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import { MRT_Localization_FR } from 'material-react-table/locales/fr';
import { MRT_Localization_PT } from 'material-react-table/locales/pt';
import { MRT_Localization_RU } from 'material-react-table/locales/ru';
// Persian/Farsi locale, used as an approximation for the unsupported Dari and Pashto
import { MRT_Localization_FA } from 'material-react-table/locales/fa';
import type { SupportedLocales } from '@common/intl';

export const getTableLocalisations = (language: SupportedLocales) => {
  switch (language) {
    case 'fr':
    case 'fr-DJ':
      return MRT_Localization_FR;
    case 'es':
      return MRT_Localization_ES;
    case 'ru':
      return MRT_Localization_RU;
    case 'pt':
      return MRT_Localization_PT;
    case 'ar':
      return MRT_Localization_AR;
    case 'prs':
    case 'ps':
      return MRT_Localization_FA;
    case 'en':
    case 'tet':
      return undefined;
    default:
      return undefined;
  }
};
