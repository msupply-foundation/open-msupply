import {
  fetchOidcConfig,
  useQuery,
  type OidcConfig,
} from '@openmsupply-client/common';

export { startOidcLogin } from '@openmsupply-client/common';

/**
 * Whether the server offers single sign-on, and what to label the button.
 *
 * The probe itself lives in `common` (`authentication/api/oidcConfig`) because `useLogout` needs it
 * too; this is just the login page's cached read of it.
 */
export const useOidcConfig = () =>
  useQuery<OidcConfig>({
    queryKey: ['oidcConfig'],
    queryFn: fetchOidcConfig,
    // Won't change while the page is open, and a failure here must not retry-spam the login page.
    staleTime: Infinity,
    retry: false,
  });
