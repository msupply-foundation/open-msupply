import {
  createEffect,
  createRoot,
  createSignal,
  on,
  type Accessor,
  type Setter,
} from 'solid-js';
import { createStore, type SetStoreFunction } from 'solid-js/store';
import { authUser } from '../../../auth/authContext';
import type { PatientOption } from '../../../domain/patient';
import type { EditedVisit } from './editVisit';
import type {
  CardItem,
  DispensedTo,
  ListLine,
  MedicineCard,
  VisitRecord,
} from './simpleDispensingLogic';

// The Simple screen's visit in progress, kept while staff go elsewhere in the
// app (spec/prescriptions rules › Dispensing records): the list, who it is for,
// the notice, and the state of a save. It lives here rather than in the
// screen, so leaving the screen doesn't drop it, and a save still out when
// staff leave finishes into the same visit the screen shows on return. That
// is what stops a visit being saved twice by leaving and coming back: the
// record id and the hold after a lost reply are the visit's, not the
// screen's.
//
// The medicines' last reads are kept with it, so the list a screen comes back
// to has its names, prices and stock at once, as it had when staff left, and
// keeps them if reading them again fails. A save that lands while staff are
// away counts the visit as dispensed, which is what has the screen they come
// back to read the cards again.
//
// In memory only: a reload starts afresh, and nothing reaches browser
// storage (contract › Dispensing records). One per signed-in user and store;
// signing out drops them all.

export type Notice = {
  severity: 'success' | 'info' | 'warning' | 'error';
  text: string;
  /** The visit the message is about, once dispensed: View opens it. */
  dispensedId?: string;
  /**
   * The message after Dispense: the screen is ready for the next patient,
   * and the list says so until the next person is chosen or the next amount
   * pressed, which take the message away (ui-surface S9 › dispensed).
   */
  dispensed?: true;
  /**
   * Says the stock was corrected (rules › correcting the stock): shown over
   * the notice about short lines, which it answers, until the list changes.
   */
  corrected?: true;
};

/**
 * A notice as the list shows it: one naming a dispensed visit offers View;
 * the message after Dispense also says the screen is ready for the next
 * patient and offers Dispensing records (ui-surface S9 › dispensed).
 */
export const withNoticeLinks = <
  N extends Pick<Notice, 'severity' | 'text'> &
    Partial<Pick<Notice, 'dispensedId' | 'dispensed'>>,
>(
  notice: N | undefined,
  links: { visitHref: (id: string) => string; recordsHref: string }
): (N & { viewHref?: string; recordsHref?: string }) | undefined => {
  if (!notice?.dispensedId) return notice;
  return {
    ...notice,
    viewHref: links.visitHref(notice.dispensedId),
    recordsHref: notice.dispensed ? links.recordsHref : undefined,
  };
};

export interface KeptVisit {
  /**
   * The user and store it was made for. Leaving drops it by this key, not
   * one worked out again then: another user may have signed in by the time
   * the screen closes.
   */
  key: string;
  patient: Accessor<PatientOption | null>;
  setPatient: Setter<PatientOption | null>;
  unnamed: Accessor<boolean>;
  setUnnamed: Setter<boolean>;
  /** Keyed by medicine, so editing one line's amount never rebuilds its row. */
  lines: ListLine[];
  setLines: SetStoreFunction<ListLine[]>;
  /** Medicines chosen from the search, read like the cards. */
  searchedIds: Accessor<string[]>;
  setSearchedIds: Setter<string[]>;
  /** The last read of the searched medicines that came back. */
  searchedRead: Accessor<CardItem[] | undefined>;
  setSearchedRead: Setter<CardItem[] | undefined>;
  /** The last read of the cards' medicines that came back. */
  cardsRead: Accessor<CardItem[] | undefined>;
  setCardsRead: Setter<CardItem[] | undefined>;
  /**
   * The list's medicines as Dispense's last check found them: until the visit
   * is dispensed, the stock and prices the screen shows for them.
   */
  checked: Accessor<MedicineCard[]>;
  setChecked: Setter<MedicineCard[]>;
  /**
   * Visits dispensed from this store's screen. The cards read their stock
   * again each time it goes up, even when the save landed while staff were
   * away and the screen showing it is a new one.
   */
  dispensedCount: Accessor<number>;
  setDispensedCount: Setter<number>;
  notice: Accessor<Notice | undefined>;
  setNotice: Setter<Notice | undefined>;
  /** A save in flight. */
  dispensing: Accessor<boolean>;
  setDispensing: Setter<boolean>;
  /**
   * A save whose reply never came: only Dispense is offered until it is
   * known.
   */
  unconfirmed: Accessor<boolean>;
  setUnconfirmed: Setter<boolean>;
  /** Clear looking for a save whose reply was lost. */
  looking: Accessor<boolean>;
  setLooking: Setter<boolean>;
  /**
   * A dispensed visit being edited in the list (rules › editing a dispensed
   * visit): kept with the list, so a trip away keeps the edit too.
   */
  editing: Accessor<EditedVisit | undefined>;
  setEditing: Setter<EditedVisit | undefined>;
  /**
   * The visit's record: its id from its first save until it is finished or
   * cleared, so a save repeated after a lost reply can never make a second
   * record. Read only by Dispense and Clear, so not a signal.
   */
  record: { current?: VisitRecord };
  /** The store's unnamed patient, once the server has given it. */
  unnamedPatient?: DispensedTo;
}

const newVisit = (key: string, startsWithUnnamed: boolean): KeptVisit => {
  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [unnamed, setUnnamed] = createSignal(startsWithUnnamed);
  const [lines, setLines] = createStore<ListLine[]>([]);
  const [searchedIds, setSearchedIds] = createSignal<string[]>([]);
  const [searchedRead, setSearchedRead] = createSignal<CardItem[]>();
  const [cardsRead, setCardsRead] = createSignal<CardItem[]>();
  const [checked, setChecked] = createSignal<MedicineCard[]>([]);
  const [dispensedCount, setDispensedCount] = createSignal(0);
  const [notice, setNotice] = createSignal<Notice | undefined>();
  const [dispensing, setDispensing] = createSignal(false);
  const [unconfirmed, setUnconfirmed] = createSignal(false);
  const [looking, setLooking] = createSignal(false);
  const [editing, setEditing] = createSignal<EditedVisit>();
  return {
    key,
    patient,
    setPatient,
    unnamed,
    setUnnamed,
    lines,
    setLines,
    searchedIds,
    setSearchedIds,
    searchedRead,
    setSearchedRead,
    cardsRead,
    setCardsRead,
    checked,
    setChecked,
    dispensedCount,
    setDispensedCount,
    notice,
    setNotice,
    dispensing,
    setDispensing,
    unconfirmed,
    setUnconfirmed,
    looking,
    setLooking,
    editing,
    setEditing,
    record: {},
  };
};

const kept = new Map<string, KeptVisit>();
const keyOf = (storeId: string) => `${authUser()?.userId ?? ''}:${storeId}`;

// Signing out drops every kept visit: the next person to sign in on this
// screen must not find the last one's list. Set up once, on first use; a
// re-login after a timeout keeps the user, so it keeps their visit too.
let watching = false;
const dropOnSignOut = () => {
  if (watching) return;
  watching = true;
  createRoot(() =>
    createEffect(
      on(authUser, user => {
        if (!user) kept.clear();
      })
    )
  );
};

/**
 * The store's visit in progress: the one kept from an earlier visit to the
 * screen, or a new one, starting with the unnamed patient where the store
 * says so.
 */
export const visitFor = (
  storeId: string,
  startsWithUnnamed: () => boolean
): KeptVisit => {
  dropOnSignOut();
  const key = keyOf(storeId);
  let visit = kept.get(key);
  if (!visit) {
    visit = newVisit(key, startsWithUnnamed());
    kept.set(key, visit);
  }
  return visit;
};

/** Whether leaving now leaves anything to come back to. */
export const worthKeeping = (visit: KeptVisit): boolean =>
  visit.lines.length > 0 ||
  visit.patient() !== null ||
  visit.dispensing() ||
  visit.unconfirmed() ||
  visit.looking() ||
  visit.editing() !== undefined ||
  visit.record.current !== undefined;

/**
 * The screen is closing. A visit with nothing on its list, no registered
 * patient chosen and no save out is dropped, so the screen next starts as a
 * new visit does; anything else is kept for the way back.
 */
export const leaveVisit = (visit: KeptVisit): void => {
  if (!worthKeeping(visit) && kept.get(visit.key) === visit)
    kept.delete(visit.key);
};

/** Tests only: start every store afresh. */
export const forgetKeptVisits = (): void => kept.clear();
