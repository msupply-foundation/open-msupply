import type { LocaleKey } from '@/intl';
import type { DispensingScreen } from '@/domain/preferences/dispensingScreen';

/*
 * Which screen Dispensing's addresses open (spec/prescriptions rules › the
 * Simple screen), worked out apart from the router so it can be tested.
 *
 * Dispensing's own address opens the store's screen: the list, or the Simple
 * screen, served right there rather than sent on to another address, so
 * Escape on it goes up to Home as from any destination (keyboard KB-X5). A
 * dispensed visit open on the Simple screen is at '/simple/<id>', since
 * '/<id>' is the record's own screen. In a store that dispenses on the list,
 * the Simple screen's addresses open the list, or the record's own screen for
 * a visit: staff can't switch screens.
 */

/** What an address under Dispensing opens. */
export type DispensingScreenRoute =
  | { kind: 'simple' }
  | { kind: 'list' }
  /** Somewhere else, relative to Dispensing's own address ('' is itself). */
  | { kind: 'redirect'; to: string };

/** Whether a path is one of the Simple screen's own addresses. */
export const atSimpleAddress = (pathname: string): boolean =>
  /\/dispensary\/dispensing\/simple(\/|$)/.test(pathname);

export const dispensingScreenRoute = (
  screen: DispensingScreen,
  simpleAddress: boolean,
  prescriptionId: string | undefined
): DispensingScreenRoute => {
  if (screen === 'SIMPLE')
    // '/simple' with no visit is the screen's old address: one screen, one
    // address (OMS-REG-NAV-01.22).
    return simpleAddress && !prescriptionId
      ? { kind: 'redirect', to: '' }
      : { kind: 'simple' };
  if (!simpleAddress) return { kind: 'list' };
  return { kind: 'redirect', to: prescriptionId ? `/${prescriptionId}` : '' };
};

/**
 * What a record that wasn't found says its OK returns to: the store's
 * dispensing screen, which is the Simple screen in a store that dispenses on
 * it (ui-surface S3, S7).
 */
export const notFoundReturnMessage = (
  screen: DispensingScreen | undefined
): LocaleKey =>
  screen === 'SIMPLE'
    ? 'messages.click-to-return-to-dispensing'
    : 'messages.click-to-return-to-prescriptions';
