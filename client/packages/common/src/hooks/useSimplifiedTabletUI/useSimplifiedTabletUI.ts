/**
 * This hook determines whether or not the UI should be displayed with the
 * "simplified" options when on a mobile device.
 *
 * Use the value returned from this hook whenever a UI element is conditional on
 * the "simplified" mobile view.
 *
 * Three criteria must be true:
 * - The store pref "Use Simplified Mobile UI" is enabled
 * - The (old) preference "Pack size to 1" is enabled
 * - The device screen size is "tablet" size or smaller
 */

import { useAppTheme, useMediaQuery, Breakpoints } from '@common/styles';
import { useAuthContext, usePreference } from '../../authentication';
import { PreferenceKey } from '@common/types';

export const useSimplifiedTabletUI = () => {
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));

  const { data } = usePreference(PreferenceKey.UseSimplifiedMobileUi);

  const { store } = useAuthContext();

  // Defaulting these values to `true` -- if the value hasn't loaded yet, it's
  // better that the UI shows too simplified than too crowded
  const packToOne = store?.preferences?.packToOne ?? true;
  const useSimplifiedMobileUi = data?.useSimplifiedMobileUi ?? true;

  return isMediumScreen && useSimplifiedMobileUi && packToOne;
};
