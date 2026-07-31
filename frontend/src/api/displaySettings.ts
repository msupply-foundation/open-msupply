/*
 * Site branding (custom theme + custom logo) at startup.
 *
 * Fetched in the same startup pass as the initialisation status and server
 * info — the query is unauthenticated server-side, which is the point: the
 * login and initialisation screens are the branded hero pages, so a site's
 * colours and logo have to be in place before anyone signs in.
 *
 * `background: true` keeps a failed probe out of the global unexpected-error
 * modal: branding is cosmetic, and the cached values from the last successful
 * boot still apply.
 */
import { graphqlFetch } from './graphql';
import {
  applyCustomLogo,
  applyCustomTheme,
  cachedLogoHash,
  cachedThemeHash,
} from '../ui/branding/applyBranding';
import { DisplaySettings } from './displaySettings.generated';

export const fetchDisplaySettings = async (): Promise<void> => {
  const result = await graphqlFetch(
    DisplaySettings,
    // Send the hashes we already hold: the server answers with the value only
    // when it differs, so an unchanged theme costs nothing.
    { input: { logo: cachedLogoHash(), theme: cachedThemeHash() } },
    { background: true }
  );
  if (result.kind !== 'success') return;

  const { customTheme, customLogo } = result.data.displaySettings;
  /*
   * A null field means "unchanged from the hash you sent" OR "never set" —
   * the server can't tell them apart (display_settings.rs `match_node`). Both
   * mean keep what we have: an unchanged theme is already applied, and if we
   * hold nothing there is nothing to hold. A setting that was CLEARED comes
   * back as an empty value with its own hash, not as null, so clearing still
   * reaches us.
   */
  if (customTheme) applyCustomTheme(customTheme.value, customTheme.hash);
  if (customLogo) applyCustomLogo(customLogo.value, customLogo.hash);
};
