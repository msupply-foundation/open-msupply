import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
  untrack,
} from 'solid-js';
import type { Component } from 'solid-js';
import { produce, reconcile } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import {
  getCurrencyInfo,
  homeCurrency,
  locale,
  localisedDateTime,
  localisedTime,
  roundedText,
  t,
} from '@/intl';
import { hasPermission, prescriptionPreferences } from '@/store/storeContext';
import { ExportPrintButton } from '@/domain/reports';
import { fetchPatientOptionById, minimalPatientOption } from '@/domain/patient';
import { ItemSearch } from '@/domain/item';
import { round9 } from '@/domain/allocation';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { Button } from '@/ui/elements/buttons/Button';
import { LinkButton } from '@/ui/elements/buttons/LinkButton';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import {
  ClockIcon,
  EditIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from '@/ui/icons';
import { useIsCompact } from '@/ui/utils/createMediaQuery';
import { generateUUID } from '@/uuid';
import { SimpleDispensingItems } from './simpleDispensing.generated';
import {
  SimpleDispense,
  SimpleDispensedVisit,
  SimpleUnnamedPatient,
} from './simpleDispense.generated';
import { AmountDialog } from './AmountDialog';
import { CorrectStockDialog } from './CorrectStockDialog';
import {
  addAmount,
  buildCards,
  correctedNext,
  dispenseOutcome,
  dispenseVisit,
  medicinesFor,
  removeLine,
  setAmount,
  shortLines,
  startsWithUnnamed,
  stockFor,
  unitsListed,
  unnamedAfterDispense,
  unnamedStillChosen,
  unreadIds,
  visitWasSaved,
  withItem,
  type CardItem,
  type ListLine,
  type MedicineCard,
  type DispenseInput,
  type DispensedTo,
  type SaveReply,
} from './simpleDispensingLogic';
import {
  SimpleCancelDispense,
  SimpleDeleteDispense,
  SimpleDispensedRecord,
  SimpleSaveChanges,
} from './dispensedVisit.generated';
import {
  afterCancelRead,
  canCancelVisit,
  canEditVisit,
  cannotEditReason,
  printableVisit,
  dispensedAt,
  visitHeading,
  visitLines,
  type DispensedRecord,
} from './dispensedVisit';
import {
  afterDeleteRead,
  editOutcome,
  saveChanges,
  visitListLines,
  withKeptAmounts,
  withOwnStock,
  type EditInput,
  type RecordLine,
  type RecordRead,
} from './editVisit';
import { shownPatientName } from '../patientName';
import { MedicineCardView } from './MedicineCard';
import {
  DispensingList,
  type EditingVisit,
  type OpenVisit,
} from './DispensingList';
import { StepHeading } from './StepHeading';
import { WhoIsItFor } from './WhoIsItFor';
import { leaveVisit, visitFor, type Notice } from './keptVisit';
import styles from './SimpleDispensing.module.css';

/*
 * The Simple screen (spec/prescriptions ui-surface S9): the store's common
 * medicines as cards, each carrying its usual amounts, and the list for the
 * person at the counter beside them. Dispensing opens on it in a store whose
 * dispensing screen is Simple; staff can't switch to the list's screen, and
 * reach past records through Dispensing records.
 */
const SimpleDispensingPage: Component = () => {
  const params = useParams<{ storeId: string; prescriptionId?: string }>();
  // The store the screen opened in, read once: a store switch remounts the
  // screen. Every request uses it, never the route's params, which are the
  // router's and follow the address: a save still out when staff switch
  // store must still go to the store it was dispensed in.
  const storeOpened = untrack(() => params.storeId);
  const recordsHref = `/${storeOpened}/dispensary/dispensing/records`;
  const simpleHref = `/${storeOpened}/dispensary/dispensing/simple`;
  const navigate = useNavigate();

  // The visit in progress, kept while staff go elsewhere (rules › Dispensing
  // records). A new visit starts with the unnamed patient where the store
  // says so; the preferences are in before this screen opens, since it waits
  // for the dispensing screen.
  const visitState = untrack(() =>
    visitFor(storeOpened, () => startsWithUnnamed(prescriptionPreferences()))
  );
  onCleanup(() => leaveVisit(visitState));
  // Setters and accessors are stable, so taking them apart is safe.
  const {
    patient,
    setPatient,
    unnamed: unnamedPicked,
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
  } = visitState;
  const visit = visitState.record;

  // While a dispensed visit is being edited, its own stock counts as
  // available (rules › editing a dispensed visit): every read of the items
  // goes through this, so the cards, the amount box, the lines and the check
  // all agree.
  const withOwn = (fetched: CardItem[]): CardItem[] => {
    const edited = editing();
    return edited ? withOwnStock(fetched, edited.lines) : fetched;
  };
  // And each medicine the visit gave knows how much, so a line left at that
  // amount stays as the visit saved it.
  const withKept = (built: MedicineCard[]): MedicineCard[] => {
    const edited = editing();
    return edited ? withKeptAmounts(built, edited.lines) : built;
  };

  // Undefined until the store context resolves, so "loading" is never shown
  // as "none set up".
  const medicines = () => prescriptionPreferences().commonMedicines;

  // The cards' items with their default prices, in one request: on load, and
  // again when Dispense checks the stock. A price that couldn't be read fails
  // the whole read, so a line never shows a price the save won't charge
  // (contract › the Simple screen). `background` keeps a failure from the
  // app's error dialog, whose reload would lose the visit: the caller says
  // what a failure means.
  const fetchItems = async (
    storeId: string,
    ids: string[],
    background = false
  ): Promise<CardItem[] | undefined> => {
    const result = await graphqlFetch(
      SimpleDispensingItems,
      { storeId, ids, page: { first: ids.length } },
      { background }
    );
    if (result.kind !== 'success') return undefined;
    if (result.data.items.__typename !== 'ItemConnector') return undefined;
    return result.data.items.nodes;
  };

  // Read again once a visit is dispensed (rules › dispensing the visit), by
  // the kept visit's count, so a screen opened while the save was still out
  // reads them again when it lands. Always in the background: the search and
  // the list work while the cards load, so a visit may be on the screen by
  // the time any read fails, and the app's error dialog would offer a reload
  // that loses it. A read that fails keeps the cards as they were, the kept
  // visit's last read when the screen has none of its own; with none at all,
  // the card area says so and offers to read them again.
  const [items, { refetch: refetchItems, mutate: mutateItems }] =
    createResource<
      CardItem[] | undefined,
      { storeId: string; ids: string[]; dispensed: number }
    >(
      () => {
        const list = medicines();
        if (!list || list.length === 0) return false;
        return {
          storeId: storeOpened,
          ids: list.map(m => m.itemId),
          dispensed: dispensedCount(),
        };
      },
      async ({ storeId, ids }, { value }) => {
        const fetched = await fetchItems(storeId, ids, true);
        if (fetched) {
          setCardsRead(fetched);
          dropCheckFromBefore();
        }
        return fetched ?? value ?? cardsRead();
      }
    );

  // Read, and none came back: the first read failed (a later one keeps the
  // cards it had). Not while it reads again, which shows as loading.
  const cardsUnread = () =>
    items.state === 'ready' && gated(items) === undefined;

  // Rebuilt per load, so compared by value: a refresh that returns the same
  // stock must not rebuild the cards.
  const cards = createMemo<MedicineCard[] | undefined>(
    () => {
      const list = medicines();
      // Until this screen's first read lands, the kept visit's last one: a
      // list kept across a trip shows its names, prices and stock at once.
      const fetched = gated(items) ?? cardsRead();
      if (!list || fetched === undefined) return undefined;
      return withKept(
        buildCards(list, withOwn(fetched), prescriptionPreferences())
      );
    },
    undefined,
    { equals: sameFetchedValue }
  );

  // Medicines chosen from the search that have no card (rules › another
  // amount, and other medicines): fetched like the cards, so a line for one is
  // priced, checked and saved the same way. Their own resource, so choosing
  // one never refetches the cards. Kept until the visit is dispensed.
  // Choosing one reads them all again, so a read that fails keeps what the
  // last one returned: the lines already on the list keep their name, unit,
  // price and stock. That last read is the kept visit's, so a screen opened
  // again shows it at once and keeps it if reading again fails. Only the read
  // for the medicines searched now is kept: each choice is a new array, so a
  // slower, earlier read never overwrites a later one. In the background: the
  // screen says what a failure means (searchFailed), and the app's error
  // dialog would offer a reload that loses the visit.
  createResource<CardItem[] | undefined, { storeId: string; ids: string[] }>(
    () => {
      const ids = searchedIds();
      return ids.length > 0 ? { storeId: storeOpened, ids } : false;
    },
    async ({ storeId, ids }) => {
      const fetched = await fetchItems(storeId, ids, true);
      if (fetched) {
        if (searchedIds() === ids) setSearchedRead(fetched);
        dropCheckFromBefore();
        return fetched;
      }
      searchFailed(ids, unreadIds(ids, searchedRead()));
      return undefined;
    }
  );
  const searched = createMemo<MedicineCard[]>(
    () => {
      const fetched = searchedRead();
      return withKept(
        buildCards(
          medicinesFor(searchedIds(), []),
          withOwn(fetched ?? []),
          prescriptionPreferences()
        )
      );
    },
    [],
    { equals: sameFetchedValue }
  );

  // The list's medicines as Dispense's last check found them (rules ›
  // dispensing the visit): until the visit is dispensed, the stock the screen
  // shows for them, so the cards, prices and short lines all agree with it.
  // The kept visit's, so they still agree after a trip away. But only until
  // this screen's own first read lands: stock may have come or gone while
  // staff were away, and that read is newer than a check made before they
  // left. A check made on this screen is newer still, so it stays.
  const checkFromBefore = untrack(checked);
  // Called from the reads above, which only land once this has run.
  function dropCheckFromBefore(): void {
    if (checkFromBefore.length > 0 && checked() === checkFromBefore)
      setChecked([]);
  }

  const cardOf = (itemId: string) =>
    checked().find(card => card.item.id === itemId) ??
    cards()?.find(card => card.item.id === itemId) ??
    searched().find(card => card.item.id === itemId);
  const stockOf = (itemId: string) => cardOf(itemId)?.stock ?? 0;
  // The stock a line of this many units is checked against: at least its
  // amount when it is still what an edited visit gave.
  const lineStock = (itemId: string, units: number) =>
    stockFor(cardOf(itemId), units);

  // Who the visit is for (rules › who it's for and the list): nothing can be
  // added until someone is chosen, and choosing someone else keeps the list.
  // Or the store's unnamed patient (rules › the unnamed patient). Both are
  // the kept visit's. Chosen only while the store still uses it: if sync
  // turns the setting off mid-visit, nobody is chosen and the list stays, so
  // the visit can't be dispensed to it.
  const unnamed = () =>
    unnamedStillChosen(unnamedPicked(), prescriptionPreferences());
  const chosen = () => unnamed() || patient() !== null;
  // Medicines can be added for someone chosen, or to a dispensed visit being
  // edited, whose patient is fixed.
  const canPress = () => chosen() || editing() !== undefined;
  // Something to come back to from an open visit: a list, or an edit.
  const listWaiting = () => lines.length > 0 || editing() !== undefined;
  const chooseUnnamed = (on: boolean) => {
    setNotice(undefined);
    setPatient(null);
    setUnnamed(on);
  };
  // The patient search hands back an id and name only, for someone found or
  // just created: read the record so their code, date of birth and gender
  // show.
  const showDetails = async (id: string) => {
    const read = await fetchPatientOptionById(storeOpened, id);
    if (read.kind === 'found' && patient()?.id === id) setPatient(read.patient);
  };

  // The list: client state until the visit is dispensed, the kept visit's.
  const update = (next: ListLine[]) =>
    setLines(reconcile(next, { key: 'itemId' }));
  // Below zero once the check finds less stock than the list holds: the card
  // then says how much it is short. A line left at what an edited visit gave
  // is never short, so its card offers nothing more instead.
  const available = (card: MedicineCard) => {
    const listed = unitsListed(lines, card.item.id);
    return round9(lineStock(card.item.id, listed) - listed);
  };
  // Nothing is added while the visit is locked (rules › dispensing the
  // visit): an amount box can open mid-save, once its medicine's batches
  // load.
  const addToList = (card: MedicineCard, units: number) => {
    if (locked()) return;
    setNotice(undefined);
    update(addAmount(lines, card.item.id, units, stockOf(card.item.id)));
  };

  // The amount box (ui-surface S9): the medicine it is open for, from a
  // card's another-amount button or the search. The search shows that
  // medicine while its box is open, and is empty again once it closes.
  const [asking, setAsking] = createSignal<string | undefined>();
  const [searchValue, setSearchValue] = createSignal('');
  const askAmount = (itemId: string) => {
    if (!cardOf(itemId) && !searchedIds().includes(itemId)) {
      setSearchedIds([...searchedIds(), itemId]);
    }
    setAsking(itemId);
  };
  const closeAmount = () => {
    setAsking(undefined);
    setSearchValue('');
  };
  // A medicine chosen from the search that couldn't be read (rules › another
  // amount, and other medicines): no box opens for it, so the search is empty
  // again and the list's notice says why. Dropped, so choosing it again reads
  // it again. Dropping it reads the medicines still searched once more: if
  // that read fails too, none of them is unread, so it changes nothing and
  // reads nothing again. Nothing to do once a read for a later choice has
  // taken over: its outcome is the one to report.
  const searchFailed = (ids: string[], unread: string[]) => {
    if (searchedIds() !== ids || unread.length === 0) return;
    setSearchedIds(now => now.filter(id => !unread.includes(id)));
    const open = asking();
    if (open !== undefined && unread.includes(open)) closeAmount();
    // A card's box may have opened while the read was out: the search still
    // shows the medicine that failed.
    if (unread.includes(searchValue())) setSearchValue('');
    setNotice({ severity: 'error', text: t('error.medicine-not-loaded') });
  };

  // A phone (spec ui-surface S9 › layout): one-row cards, and the list as a
  // bar at the bottom of the screen. Which layout renders, not spacing.
  const isPhone = useIsCompact();

  // Dispense (rules › dispensing the visit): check the stock again, stop with
  // the short lines marked if anything ran out, else save the whole visit in
  // one transaction and clear the screen for the next person.
  // The save's state, the notice and the visit's record (rules › dispensing
  // the visit) are the kept visit's: a save still out when staff leave
  // finishes into it. A save whose reply never came may have gone through:
  // until Dispense finds out, the visit can't be changed, and only Dispense
  // is offered.
  // While a save is in flight or unconfirmed, nothing about the visit can
  // change: a press or an edit then would miss the save, or be cleared with
  // the list once it lands.
  const locked = () => dispensing() || unconfirmed() || looking();

  // What a Dispense or a Clear works by, taken as it is pressed: the store's
  // dispensing settings, its common medicines and its currency's smallest
  // unit. A save still out when staff switch store goes on after this screen
  // has closed, and by then the store context is the other store's (or its
  // defaults while it loads). The visit is checked, saved and finished by its
  // own store's settings: which batches it takes, how its prices compare, and
  // whether the unnamed patient stays chosen.
  const settingsNow = () => ({
    prefs: prescriptionPreferences(),
    medicines: medicines() ?? [],
    priceDecimals: getCurrencyInfo(homeCurrency(), locale()).decimals,
  });
  type Settings = ReturnType<typeof settingsNow>;

  /** The list's medicines as the stock stands now. */
  const freshCards = async (
    listed: readonly ListLine[],
    settings: Settings,
    // An edited visit's lines as just read: its own stock counts as
    // available.
    own: readonly RecordLine[] = []
  ): Promise<MedicineCard[] | undefined> => {
    const ids = listed.map(line => line.itemId);
    // Background: a failed check is the screen's to report, and the app's
    // error dialog would offer a reload that loses the visit.
    const fetched = await fetchItems(storeOpened, ids, true);
    if (!fetched) return undefined;
    return withKeptAmounts(
      buildCards(
        medicinesFor(ids, settings.medicines),
        withOwnStock(fetched, own),
        settings.prefs
      ),
      own
    );
  };

  const unsure = (): void => {
    setUnconfirmed(true);
    setNotice({ severity: 'error', text: t('error.dispense-unconfirmed') });
  };

  /** The visit is saved: ready the screen for the next person. */
  const finished = (who: DispensedTo, settings: Settings): void => {
    // The record just saved, for the message's View.
    const dispensedId = visit.current?.id;
    visit.current = undefined;
    setUnconfirmed(false);
    setChecked([]);
    update([]);
    setPatient(null);
    // The unnamed patient stays chosen after a visit to it (rules › the
    // unnamed patient).
    setUnnamed(unnamedAfterDispense(who, settings.prefs));
    setSearchedIds([]);
    // The next visit reads its medicines afresh: none of this one's stock
    // stands in for them while that read is out, or after it fails.
    setSearchedRead(undefined);
    setNotice({
      severity: 'success',
      // "Unnamed patient" would read the same for every walk-in: when, not
      // who.
      text: who.isUnnamed
        ? t('messages.dispensed-at', { time: localisedTime(new Date()) })
        : t('messages.dispensed-to', { name: who.name }),
      dispensedId,
    });
    // The cards read their stock again, on whichever screen shows the visit
    // now: this one, or one opened while the save was out.
    setDispensedCount(n => n + 1);
  };

  /**
   * Whether an earlier save of this visit went through: undefined when the
   * server couldn't be asked. Quiet (background): the screen's own notice
   * says what a failed look means.
   */
  const savedEarlier = async (id: string): Promise<boolean | undefined> => {
    const found = await graphqlFetch(
      SimpleDispensedVisit,
      { storeId: storeOpened, id },
      { background: true }
    );
    return found.kind === 'success'
      ? visitWasSaved(found.data.invoice)
      : undefined;
  };

  /** One save of the visit. */
  const save = async (input: DispenseInput): Promise<SaveReply> => {
    // Background: a lost reply is this screen's to explain (its notice, and
    // the hold on the visit), not the app's error dialog, which would say the
    // connection failed over a visit the look finds dispensed.
    const result = await graphqlFetch(
      SimpleDispense,
      { storeId: storeOpened, input },
      { returnGraphqlErrors: true, background: true }
    );
    if (result.kind === 'unexpectedError') return { kind: 'lost' };
    if (result.kind === 'success')
      return {
        kind: 'reply',
        outcome: dispenseOutcome(
          result.data.batchPrescription,
          input.insertPrescriptionLines.length
        ),
      };
    // A GraphQL error (a refusal, nothing saved); missing permission names
    // what is missing.
    return {
      kind: 'reply',
      outcome: 'refused',
      missing:
        result.kind === 'graphqlError' && isForbidden(result.errors)
          ? missingPermissions(result.errors)
          : undefined,
    };
  };

  /**
   * Who the visit is saved for: the chosen patient, or the store's unnamed
   * patient, which the server creates the first time it is asked. Undefined
   * when nobody is chosen; `failed` when the unnamed patient couldn't be
   * had, and nothing has been saved.
   */
  const dispensedTo = async (
    settings: Settings
  ): Promise<
    DispensedTo | { failed: true; missing?: string[] } | undefined
  > => {
    if (!unnamedStillChosen(unnamedPicked(), settings.prefs))
      return patient() ?? undefined;
    if (visitState.unnamedPatient) return visitState.unnamedPatient;
    // Background: a failure is this screen's to say, as Dispense's is.
    const result = await graphqlFetch(
      SimpleUnnamedPatient,
      { storeId: storeOpened },
      { returnGraphqlErrors: true, background: true }
    );
    if (result.kind !== 'success')
      return {
        failed: true,
        missing:
          result.kind === 'graphqlError' && isForbidden(result.errors)
            ? missingPermissions(result.errors)
            : undefined,
      };
    visitState.unnamedPatient = {
      ...result.data.getOrCreateUnnamedPatient,
      isUnnamed: true,
    };
    return visitState.unnamedPatient;
  };

  /** Check the list against the stock now; save it if it is all there. */
  const checkAndSave = async (settings: Settings): Promise<void> => {
    const who = await dispensedTo(settings);
    if (!who) return;
    if ('failed' in who) {
      if (who.missing) reportPermissionDenied(who.missing);
      setNotice({ severity: 'error', text: t('error.dispense-failed') });
      return;
    }
    setUnconfirmed(false);
    // The list as it stands now, so the check and the save are of the same
    // lines.
    const listed = lines.map(line => ({ ...line }));
    const end = await dispenseVisit(visit, who, listed, {
      look: savedEarlier,
      check: listed => freshCards(listed, settings),
      save,
      before: cardOf,
      newId: generateUUID,
      // Prices compare to the store's currency's smallest unit, as shown.
      priceDecimals: settings.priceDecimals,
    });
    if (end.kind === 'saved') return finished(end.patient, settings);
    if (end.kind === 'unsure') return unsure();
    // The stock as it now is becomes the screen's, so the lines' prices and
    // the total show what it costs now. A short line is left as it is, and
    // says so; a line whose price changed says so too: staff choose, or
    // check the total, then press Dispense again.
    if (end.checked) setChecked(end.checked);
    if (end.kind === 'stopped') return markRepriced(end.repriced);
    // Refused, so nothing was saved. Missing permission gets the app's own
    // permission-denied message as well.
    if (end.missing) reportPermissionDenied(end.missing);
    setNotice({ severity: 'error', text: t('error.dispense-failed') });
  };

  // Clear (rules › who it's for and the list): at once, unless a save of
  // this visit lost its reply and may yet have landed: then it looks first,
  // and a visit it finds saved is finished rather than cleared.
  const clear = async (): Promise<void> => {
    const settings = settingsNow();
    const sentFor = visit.current?.sentFor;
    if (sentFor) {
      setLooking(true);
      const saved = await savedEarlier(visit.current!.id).finally(() =>
        setLooking(false)
      );
      if (saved === undefined) return unsure();
      if (saved) return finished(sentFor, settings);
    }
    visit.current = undefined;
    update([]);
    // Nothing is left on the list for the last check, or a message about the
    // list, to speak for.
    setChecked([]);
    setNotice(undefined);
  };

  // Marks the lines whose price changed (rules › dispensing the visit): in
  // place, so no line's amount field is rebuilt. Each mark goes once
  // Dispense is pressed again, or its amount changes (a new line object).
  const markRepriced = (itemIds: readonly string[]): void =>
    setLines(
      produce(draft => {
        for (const line of draft) {
          if (itemIds.includes(line.itemId)) line.repriced = true;
          else delete line.repriced;
        }
      })
    );

  const dispense = async () => {
    // Clear may be about to empty the list, or finish the visit its look
    // finds saved: a save now would be of a list that is gone, with a new id
    // (rules › dispensing the visit). Dispense is disabled then, so this is a
    // backstop.
    if (looking()) return;
    const settings = settingsNow();
    setNotice(undefined);
    markRepriced([]);
    setDispensing(true);
    try {
      await checkAndSave(settings);
    } finally {
      setDispensing(false);
    }
  };

  // Editing a dispensed visit (rules › editing a dispensed visit): its
  // medicines on the list, saved to the same record. The edit is the kept
  // visit's, like the list, so a trip away keeps it.

  /** The record now, for Save changes and Delete; undefined when unread. */
  const readRecord = async (id: string): Promise<RecordRead | undefined> => {
    const result = await graphqlFetch(
      SimpleDispensedRecord,
      { storeId: storeOpened, id },
      { returnGraphqlErrors: true, background: true }
    );
    if (result.kind !== 'success') return undefined;
    const node = result.data.invoice;
    if (node.__typename === 'InvoiceNode')
      return { kind: 'read', record: node };
    return node.error.__typename === 'RecordNotFound'
      ? { kind: 'gone' }
      : undefined;
  };

  /** One save of the changes. */
  const saveEditInput = async (input: EditInput): Promise<SaveReply> => {
    // Background: a lost reply is this screen's to explain.
    const result = await graphqlFetch(
      SimpleSaveChanges,
      { storeId: storeOpened, input },
      { returnGraphqlErrors: true, background: true }
    );
    if (result.kind === 'unexpectedError') return { kind: 'lost' };
    if (result.kind === 'success')
      return {
        kind: 'reply',
        outcome: editOutcome(result.data.batchPrescription, input),
      };
    return {
      kind: 'reply',
      outcome: 'refused',
      missing:
        result.kind === 'graphqlError' && isForbidden(result.errors)
          ? missingPermissions(result.errors)
          : undefined,
    };
  };

  /**
   * Edit: the visit's medicines onto the list, which must be empty, and the
   * screen back to the list. Its medicines without a card are read as
   * searched ones are.
   */
  const startEdit = (record: DispensedRecord): void => {
    if (lines.length > 0 || editing()) return;
    const listed = visitListLines(record.lines.nodes);
    const common = new Set((medicines() ?? []).map(m => m.itemId));
    setSearchedIds(
      listed.map(line => line.itemId).filter(itemId => !common.has(itemId))
    );
    setChecked([]);
    setNotice(undefined);
    setEditing({
      id: record.id,
      dispensedAt: dispensedAt(record),
      forName: whoFor(record),
      patientName: record.patient?.name,
      unnamed: record.patient?.isUnnamed ?? false,
      lines: record.lines.nodes,
      newLineIds: {},
    });
    update(listed);
    navigate(simpleHref);
  };

  /**
   * The edit is over: the list is empty, whoever was chosen before Edit is
   * chosen again, and the message says what happened.
   */
  const endEdit = (said: Notice): void => {
    setEditing(undefined);
    update([]);
    setChecked([]);
    setSearchedIds([]);
    setSearchedRead(undefined);
    setNotice(said);
  };

  /** Discard changes: the record stays as it was. */
  const discard = (): void => {
    const edited = editing();
    if (!edited) return;
    endEdit({
      severity: 'info',
      text: t('messages.changes-discarded'),
      dispensedId: edited.id,
    });
  };

  /** Save changes (rules › editing a dispensed visit). */
  const saveEdit = async (): Promise<void> => {
    const edited = editing();
    if (!edited) return;
    const settings = settingsNow();
    setNotice(undefined);
    markRepriced([]);
    setDispensing(true);
    try {
      const listed = lines.map(line => ({ ...line }));
      const end = await saveChanges(edited.id, listed, {
        read: readRecord,
        check: (listed, own) => freshCards(listed, settings, own),
        save: saveEditInput,
        before: cardOf,
        // Made once per batch and kept: a save repeated after a lost reply
        // is refused rather than taking the stock twice.
        lineIdFor: batchId => (edited.newLineIds[batchId] ??= generateUUID()),
        priceDecimals: settings.priceDecimals,
      });
      if (end.kind === 'saved') {
        endEdit({
          severity: 'success',
          text: edited.unnamed
            ? t('messages.changes-saved-at', {
                time: localisedTime(new Date()),
              })
            : t('messages.changes-saved-to', {
                name: edited.patientName ?? '',
              }),
          dispensedId: edited.id,
        });
        // The cards read their stock again.
        setDispensedCount(n => n + 1);
        return;
      }
      if (end.kind === 'not-editable')
        return endEdit({
          severity: 'error',
          text: t('error.dispense-not-editable'),
          dispensedId: edited.id,
        });
      if (end.kind === 'unsure') {
        setNotice({ severity: 'error', text: t('error.changes-unconfirmed') });
        return;
      }
      // The record as just read is the visit's own stock from now on, and
      // the stock as it now is becomes the screen's.
      if (end.kind === 'stopped' || end.lines)
        setEditing({ ...edited, lines: end.lines ?? edited.lines });
      if (end.checked) setChecked(end.checked);
      if (end.kind === 'stopped') return markRepriced(end.repriced);
      if (end.missing) reportPermissionDenied(end.missing);
      setNotice({ severity: 'error', text: t('error.changes-not-saved') });
    } finally {
      setDispensing(false);
    }
  };

  // Delete dispensing record, for the visit being edited: a Picked record
  // can't be cancelled, only deleted. Asks first.
  const [confirmingDelete, setConfirmingDelete] = createSignal<string>();
  const deleteEdited = async (id: string): Promise<void> => {
    if (editing()?.id !== id) return;
    setNotice(undefined);
    setDispensing(true);
    try {
      const result = await graphqlFetch(
        SimpleDeleteDispense,
        { storeId: storeOpened, id },
        { returnGraphqlErrors: true, background: true }
      );
      let outcome:
        'deleted' | 'generated' | 'not-editable' | 'failed' | 'unconfirmed' =
        'failed';
      if (result.kind === 'success') {
        const reply = result.data.deletePrescription;
        const refused =
          reply.__typename === 'DeletePrescriptionError'
            ? reply.error.__typename
            : undefined;
        outcome =
          refused === undefined || refused === 'RecordNotFound'
            ? 'deleted'
            : refused === 'CannotDeleteGeneratedDispensation'
              ? 'generated'
              : refused === 'CannotEditInvoice'
                ? 'not-editable'
                : 'failed';
      } else if (result.kind === 'unexpectedError') {
        // The reply was lost: the record says whether it went. If it can't
        // be read either, the screen can't tell, and says so: pressing
        // Delete again finds out (a record already gone counts as deleted).
        const check = afterDeleteRead(await readRecord(id));
        outcome =
          check === 'unknown'
            ? 'unconfirmed'
            : check === 'not-deleted'
              ? 'failed'
              : check;
      } else if (result.kind === 'graphqlError' && isForbidden(result.errors))
        reportPermissionDenied(missingPermissions(result.errors));
      if (outcome === 'deleted') {
        endEdit({ severity: 'success', text: t('messages.dispense-deleted') });
        setDispensedCount(n => n + 1);
      } else if (outcome === 'not-editable')
        endEdit({
          severity: 'error',
          text: t('error.dispense-not-editable'),
          dispensedId: id,
        });
      else
        setNotice({
          severity: 'error',
          text: t(
            outcome === 'generated'
              ? 'messages.cant-delete-generated-dispensation'
              : outcome === 'unconfirmed'
                ? 'error.dispense-delete-unconfirmed'
                : 'error.dispense-not-deleted'
          ),
        });
    } finally {
      setDispensing(false);
    }
  };

  // What the list shows while a visit is being edited.
  const editingList = createMemo<EditingVisit | undefined>(() => {
    const edited = editing();
    if (!edited) return undefined;
    return {
      heading: t('heading.editing-dispense', {
        datetime: localisedDateTime(edited.dispensedAt),
      }),
      forName: edited.forName,
      onDelete: () => setConfirmingDelete(edited.id),
    };
  });

  // A dispensed visit open in the list's place (rules › a dispensed visit),
  // by the record id after the screen's address. The visit in progress waits
  // behind it, untouched. Read in the background, and never suspending: the
  // screen is already open, a visit may be on it, and the app's error dialog
  // would offer a reload that loses that visit.
  const viewingId = () => params.prescriptionId;
  type OpenRead =
    | { id: string; kind: 'read'; record: DispensedRecord }
    | { id: string; kind: 'notFound' }
    | { id: string; kind: 'unread' };
  const [opened, { refetch: readOpenedAgain }] = createResource<
    OpenRead,
    string
  >(
    () => viewingId() ?? false,
    async id => {
      const result = await graphqlFetch(
        SimpleDispensedRecord,
        { storeId: storeOpened, id },
        { returnGraphqlErrors: true, background: true }
      );
      // Refused for want of a permission: the permission dialog says which,
      // as on any other screen (a background read opens no dialog itself).
      if (result.kind === 'graphqlError' && isForbidden(result.errors))
        reportPermissionDenied(missingPermissions(result.errors));
      if (result.kind !== 'success') return { id, kind: 'unread' };
      const node = result.data.invoice;
      if (node.__typename === 'InvoiceNode')
        return { id, kind: 'read', record: node };
      // Not found only when the server says so; anything else it answers
      // is a read that failed.
      return node.error.__typename === 'RecordNotFound'
        ? { id, kind: 'notFound' }
        : { id, kind: 'unread' };
    }
  );
  // Only the read for the visit open now: opening another shows it loading,
  // not the last one. A memo that lets through only a change in what was
  // read: a re-read flips the resource's state twice, and each flip would
  // otherwise rebuild the open visit, its buttons and their focus with it
  // (kdd/solid-reactivity-pitfalls §16).
  const openedNow = createMemo(
    () => {
      const read = gated(opened);
      return read && read.id === viewingId() ? read : undefined;
    },
    undefined,
    {
      equals: (a, b) =>
        a?.id === b?.id &&
        a?.kind === b?.kind &&
        (a?.kind === 'read' ? a.record : undefined) ===
          (b?.kind === 'read' ? b.record : undefined),
    }
  );
  const openedRecord = () => {
    const read = openedNow();
    return read?.kind === 'read' ? read.record : undefined;
  };

  // What a cancel did, for the visit it was for: shown only while that
  // visit is open.
  const [visitNotice, setVisitNotice] = createSignal<{
    id: string;
    notice: Notice;
  }>();
  // The visit the confirmation is for. Closed when another visit opens, or
  // the screen goes back to the list, so OK never cancels a visit it wasn't
  // opened over.
  const [confirmingCancel, setConfirmingCancel] = createSignal<string>();
  createEffect(
    on(viewingId, () => setConfirmingCancel(undefined), { defer: true })
  );
  // The visit being cancelled.
  const [cancelling, setCancelling] = createSignal<string>();
  // Cancel a finished visit (rules › a dispensed visit): in the background,
  // so a failure is this screen's message and not the app's error dialog.
  // Busy until the visit has been read again, so Cancel never offers itself
  // over a visit that is already cancelled.
  const cancelOpened = async (id: string): Promise<void> => {
    setVisitNotice(undefined);
    setCancelling(id);
    const cancelled = async (): Promise<void> => {
      setVisitNotice({
        id,
        notice: {
          severity: 'success',
          text: t('messages.dispense-cancelled'),
        },
      });
      // Its stock is back on the cards, and the visit now reads cancelled:
      // read again only while it is still the one open.
      void refetchItems();
      if (viewingId() === id) await readOpenedAgain();
    };
    try {
      const result = await graphqlFetch(
        SimpleCancelDispense,
        { storeId: storeOpened, id },
        { returnGraphqlErrors: true, background: true }
      );
      if (
        result.kind === 'success' &&
        result.data.updatePrescription.__typename === 'InvoiceNode'
      )
        return await cancelled();
      if (result.kind === 'graphqlError' && isForbidden(result.errors))
        reportPermissionDenied(missingPermissions(result.errors));
      // A lost reply, or a refusal: the cancel may have gone through, now or
      // by an earlier press whose reply was lost (a second cancel is refused).
      // The record says which; "nothing changed" only when it still isn't
      // cancelled.
      const check = afterCancelRead(await readRecord(id));
      if (check === 'cancelled') return await cancelled();
      setVisitNotice({
        id,
        notice: {
          severity: 'error',
          text:
            check === 'not-cancelled'
              ? t('error.dispense-not-cancelled')
              : t('error.dispense-cancel-unconfirmed'),
        },
      });
    } finally {
      setCancelling(undefined);
    }
  };

  /** Who a dispensed visit was for, with their code where they have one. */
  const whoFor = (record: DispensedRecord): string | undefined => {
    const who = record.patient;
    if (!who) return undefined;
    if (who.isUnnamed) return shownPatientName(who.name, true);
    return who.code ? `${who.name} · ${who.code}` : who.name;
  };
  const headingOf = (record: DispensedRecord): string => {
    const heading = visitHeading(record);
    if (heading.kind === 'cancelled')
      return t('heading.cancelled-dispense', {
        cancelled: localisedDateTime(heading.cancelledAt),
        dispensed: localisedDateTime(heading.at),
      });
    return t(
      heading.kind === 'created'
        ? 'heading.created-datetime'
        : 'heading.dispensed-datetime',
      { datetime: localisedDateTime(heading.at) }
    );
  };

  // What is in the list's place while a visit is open. A memo: the panel
  // reads it more than once, and the elements in it can only be placed once.
  // The cancel button reads `cancelling` itself, so pressing it doesn't
  // rebuild the visit.
  const openVisit = createMemo<OpenVisit | undefined>(() => {
    if (viewingId() === undefined) return undefined;
    const read = openedNow();
    if (read?.kind !== 'read')
      return {
        heading: t('heading.dispensing-record'),
        forName: undefined,
        lines: undefined,
        total: undefined,
        message:
          read === undefined ? (
            <EmptyState
              graphic={false}
              message={t('loading')}
              data-testid="dispensed-visit-loading"
            />
          ) : read.kind === 'notFound' ? (
            <EmptyState
              graphic={false}
              message={t('error.prescription-not-found')}
              data-testid="dispensed-visit-not-found"
            />
          ) : (
            <EmptyState
              graphic={false}
              message={t('error.dispensed-visit-not-read')}
              data-testid="dispensed-visit-not-read"
            >
              <Button
                variant="ghost"
                data-testid="dispensed-visit-read-again-button"
                // Busy while it reads, so a second press sends nothing more.
                loading={opened.loading}
                disabled={opened.loading}
                onClick={() => void readOpenedAgain()}
              >
                {t('button.try-again')}
              </Button>
            </EmptyState>
          ),
      };
    const record = read.record;
    const reason = cannotEditReason(record);
    const mayCancel = hasPermission('CANCEL_FINALISED_INVOICES');
    const mayEdit = hasPermission('PRESCRIPTION_MUTATE');
    // Read in the button's own bindings, so a list changing behind the open
    // visit never rebuilds it.
    const listInProgress = () => lines.length > 0 || editing() !== undefined;
    return {
      heading: headingOf(record),
      forName: whoFor(record),
      lines: visitLines(record.lines.nodes),
      total: record.pricing.totalAfterTax,
      reason: reason ? t(reason) : undefined,
      action: canEditVisit(record) ? (
        <Button
          variant="secondary"
          icon={<EditIcon />}
          data-testid="edit-dispense-button"
          title={
            !mayEdit
              ? t('messages.edit-dispense-not-allowed')
              : listInProgress()
                ? t('messages.edit-dispense-list-in-progress')
                : undefined
          }
          disabled={!mayEdit || listInProgress()}
          onClick={() => startEdit(record)}
        >
          {t('button.edit')}
        </Button>
      ) : canCancelVisit(record) ? (
        // Shown without the permission too, disabled, saying why (rules ›
        // a dispensed visit), as the record screen's cancel is.
        <Button
          variant="danger"
          icon={<MinusCircleIcon />}
          data-testid="cancel-prescription-button"
          title={
            mayCancel
              ? undefined
              : t('messages.cancel-prescription-not-allowed')
          }
          disabled={!mayCancel || cancelling() === record.id}
          loading={cancelling() === record.id}
          onClick={() => setConfirmingCancel(record.id)}
        >
          {t('label.cancel-prescription')}
        </Button>
      ) : undefined,
    };
  });

  // Lines holding more than the stock now shows, and lines whose price
  // changed. While there are any (and Dispense isn't checking again), the
  // notice that the visit wasn't dispensed, naming each of them.
  const short = () => shortLines(lines, lineStock);
  const repriced = () => lines.filter(line => line.repriced);
  const named = (listed: readonly ListLine[]) =>
    new Intl.ListFormat(locale(), { type: 'conjunction' }).format(
      listed.map(line => cardOf(line.itemId)?.item.name ?? '')
    );
  const shownNotice = () => {
    if (dispensing()) return notice();
    // A correction answers a short line, so it says what to do next instead.
    if (notice()?.corrected) return notice();
    const shortNow = short();
    const repricedNow = repriced();
    if (shortNow.length === 0 && repricedNow.length === 0) return notice();
    return {
      severity: 'warning' as const,
      text:
        repricedNow.length === 0
          ? t('messages.not-dispensed-short', { items: named(shortNow) })
          : shortNow.length === 0
            ? t('messages.not-dispensed-price', { items: named(repricedNow) })
            : t('messages.not-dispensed-short-and-price', {
                short: named(shortNow),
                repriced: named(repricedNow),
              }),
    };
  };

  // The list's notice place: what the open visit's cancel did while a visit
  // is open, else the visit in progress's own, with View on the message that
  // a visit was dispensed.
  const listNotice = () => {
    const viewing = viewingId();
    if (viewing !== undefined) {
      const cancelled = visitNotice();
      return cancelled?.id === viewing ? cancelled.notice : undefined;
    }
    const notice = shownNotice();
    if (!notice || !('dispensedId' in notice) || !notice.dispensedId)
      return notice;
    return { ...notice, viewHref: `${simpleHref}/${notice.dispensedId}` };
  };

  // The one dispensed visit Export/Print is for (rules › printing a dispensed
  // visit): the visit open on the screen, once read; else, with nothing on
  // the list and no edit under way, the visit the message names.
  const printableId = (): string | undefined => {
    const said = shownNotice();
    return printableVisit({
      viewing: viewingId() !== undefined,
      openedId: openedRecord()?.id,
      editing: editing() !== undefined,
      listed: lines.length,
      namedId: said && 'dispensedId' in said ? said.dispensedId : undefined,
    });
  };

  /** The breadcrumb's last crumb: who the open visit was for, and when. */
  const crumbOf = (record: DispensedRecord | undefined): string => {
    if (!record) return t('heading.dispensing-record');
    const who = record.patient
      ? shownPatientName(record.patient.name, record.patient.isUnnamed)
      : undefined;
    const when = localisedDateTime(dispensedAt(record));
    return who ? `${who} · ${when}` : when;
  };

  // Correct the stock (rules › correcting the stock): offered to staff who
  // may adjust stock, for the medicine it was opened for, with the amount
  // typed in the amount box when it was opened from there. `refocus` puts
  // focus back where it was opened from once it saves: the button that
  // opened it is gone by then, so the dialog can't return focus to it.
  const canCorrect = () => hasPermission('INVENTORY_ADJUSTMENT_MUTATE');
  type Correcting = { itemId: string; typed: number; refocus: () => void };
  const [correcting, setCorrecting] = createSignal<Correcting | undefined>();

  // The medicine read again after a correction, in place of its earlier copy
  // wherever the screen holds it: the cards, the medicines from the search
  // and Dispense's last check, so every figure on the screen follows. In the
  // background: if it fails, the screen keeps what it showed, and the next
  // Dispense checks the stock again anyway.
  const readAgain = async (itemId: string): Promise<void> => {
    const fetched = await fetchItems(storeOpened, [itemId], true);
    const fresh = fetched?.find(item => item.id === itemId);
    if (!fresh) return;
    mutateItems(now => withItem(now, fresh));
    setCardsRead(now => withItem(now, fresh));
    setSearchedRead(now => withItem(now, fresh));
    if (checked().some(card => card.item.id === itemId)) {
      const [card] = buildCards(
        medicinesFor([itemId], medicines() ?? []),
        [fresh],
        prescriptionPreferences()
      );
      if (card)
        setChecked(checked().map(now => (now.item.id === itemId ? card : now)));
    }
  };

  // Saved: the count is the system's figure now. A line that stopped at the
  // old figure no longer says so, and the notice says what to do next.
  const corrected = (opened: Correcting, count: number): void => {
    setCorrecting(undefined);
    opened.refocus();
    const { itemId, typed } = opened;
    const card = cardOf(itemId);
    const listed = unitsListed(lines, itemId);
    const stopped = lines.some(line => line.itemId === itemId && line.capped);
    if (stopped)
      setLines(
        produce(draft => {
          const line = draft.find(l => l.itemId === itemId);
          if (line) delete line.capped;
        })
      );
    const next = correctedNext({ count, listed, typed, stopped });
    const key =
      next === 'lower'
        ? 'messages.stock-corrected-lower'
        : next === 'raise'
          ? 'messages.stock-corrected-raise'
          : next === 'dispense'
            ? 'messages.stock-corrected-dispense'
            : 'messages.stock-corrected';
    setNotice({
      severity: next === 'lower' ? 'warning' : 'success',
      // The unit as set up, never pluralised (#666); none leaves no gap.
      text: t(key, {
        quantity: roundedText(count),
        unit: card?.item.unitName ?? '',
        item: card?.item.name ?? '',
        amount: roundedText(listed + typed),
      }).replace(/\s+/g, ' '),
      corrected: true,
    });
    void readAgain(itemId);
  };

  return (
    <Page
      // The cards and the list fill the body and own its scroll, so the list
      // can dock at its inline end, the body's full height.
      fillBody
      header={
        <Header>
          <Show
            when={viewingId() === undefined}
            fallback={
              // A dispensed visit: back to the screen, or to the records it
              // was found in (ui-surface S9 › a dispensed visit).
              <Breadcrumb
                crumbs={[
                  { label: t('dispensing'), to: simpleHref },
                  { label: t('button.dispensing-records'), to: recordsHref },
                  { label: crumbOf(openedRecord()) },
                ]}
              />
            }
          >
            <Breadcrumb crumbs={[{ label: t('dispensing') }]} />
          </Show>
          {/* Not while a dispensed visit is open: the header would name the
              visit in progress over another person's record. It is still
              chosen when the visit comes back. Nor while one is edited: who
              it was for can't change, and the list says who. */}
          <Show when={viewingId() === undefined && !editing()}>
            <WhoIsItFor
              storeId={storeOpened}
              patient={patient()}
              useUnnamed={prescriptionPreferences().useUnnamedPatient}
              unnamed={unnamed()}
              disabled={locked()}
              onSelect={chosen => {
                setNotice(undefined);
                setUnnamed(false);
                setPatient(minimalPatientOption(chosen.id, chosen.name));
                void showDetails(chosen.id);
              }}
              onClear={() => {
                setNotice(undefined);
                setPatient(null);
              }}
              onUnnamed={() => chooseUnnamed(true)}
              onChange={() => chooseUnnamed(false)}
            />
          </Show>
          {/* Staff can't switch screens (rules › the Simple screen): the list
              is where past records are found. Nothing on this screen's list
              goes with it: none of it was saved. */}
          <HeaderButtons>
            {/* The way back from a dispensed visit, first: to the visit in
                progress, or a new one when there is nothing on the list. */}
            <Show when={viewingId() !== undefined}>
              <LinkButton
                href={simpleHref}
                variant="secondary"
                icon={listWaiting() ? undefined : <PlusCircleIcon />}
                data-testid={
                  listWaiting() ? 'back-to-list-button' : 'new-dispense-button'
                }
              >
                {listWaiting()
                  ? t('button.back-to-list')
                  : t('button.new-dispense')}
              </LinkButton>
            </Show>
            {/* The store's forms for one dispensed visit, never a list in
                progress (rules › printing a dispensed visit). */}
            <ExportPrintButton
              context="PRESCRIPTION"
              dataId={printableId() ?? ''}
              disabled={printableId() === undefined}
              disabledReason={t('messages.print-dispensed-visit-only')}
            />
            <LinkButton
              href={recordsHref}
              variant="secondary"
              icon={<ClockIcon />}
              data-testid="dispensing-records-button"
            >
              {t('button.dispensing-records')}
            </LinkButton>
          </HeaderButtons>
        </Header>
      }
    >
      <div class={styles.columns}>
        <div class={styles.cardsColumn}>
          <StepHeading
            n={2}
            heading
            label={t('heading.choose-medicines')}
            // No hint over a dispensed visit: there is no one to choose and
            // nothing to press (ui-surface S9).
            hint={
              viewingId() !== undefined
                ? undefined
                : !canPress()
                  ? t('messages.choose-who-first')
                  : t('messages.press-an-amount')
            }
            testId="choose-medicines-hint"
          />
          <div class={styles.search}>
            <ItemSearch
              label={t('label.search-all-medicines')}
              hideLabel
              placeholder={t('label.search-all-medicines')}
              storeId={storeOpened}
              // The same medicines as the line editor's search.
              includeHiddenWithStock
              width="full"
              clearable={false}
              disabled={!canPress() || locked() || viewingId() !== undefined}
              value={searchValue()}
              onSelect={item => {
                if (!item) return;
                setSearchValue(item.id);
                askAmount(item.id);
              }}
            />
          </div>
          {/* At most three columns, never narrower than three amount
              buttons and the another-amount button need. */}
          {/* Until someone is chosen the cards' buttons are disabled,
              so they dim as every disabled control does. The names and
              stock stay full strength: staff read them while choosing. */}
          {/* Only the cards wait for their read. The search and the list
              are there from the start and stay, so staff can still add a
              medicine without cards, and common medicines set up while a
              visit is on the screen never hide it (rules › the Simple
              screen). */}
          <Switch
            fallback={
              <EmptyState
                graphic={false}
                // Set up but none of them dispensable here any more is
                // a different fix from none set up, so it says which.
                message={t(
                  medicines()?.length === 0
                    ? 'messages.no-common-medicines'
                    : 'messages.no-common-medicines-dispensable'
                )}
                data-testid="nothing-here"
              />
            }
          >
            <Match when={(cards() ?? []).length > 0}>
              <CardGrid
                equalHeight
                minColumnWidth="max(17rem, calc((100% - 2 * var(--space-5)) / 3))"
              >
                <For each={cards()}>
                  {card => (
                    <MedicineCardView
                      card={card}
                      available={available(card)}
                      listed={unitsListed(lines, card.item.id)}
                      oneRow={isPhone()}
                      // Not while a dispensed visit is open: a press would
                      // read as adding to it (rules › a dispensed visit).
                      canAdd={
                        canPress() && !locked() && viewingId() === undefined
                      }
                      onAmount={(_, amount) => addToList(card, amount)}
                      onAskAmount={() => askAmount(card.item.id)}
                    />
                  )}
                </For>
              </CardGrid>
            </Match>
            <Match when={cardsUnread()}>
              <EmptyState
                graphic={false}
                message={t('messages.common-medicines-not-read')}
                data-testid="cards-not-read"
              >
                <Button
                  variant="ghost"
                  data-testid="cards-read-again-button"
                  onClick={() => void refetchItems()}
                >
                  {t('button.try-again')}
                </Button>
              </EmptyState>
            </Match>
            <Match when={cards() === undefined && medicines()?.length !== 0}>
              <EmptyState
                graphic={false}
                message={t('loading')}
                data-testid="cards-loading"
              />
            </Match>
          </Switch>
        </div>
        {/* Docked at the columns' inline end, or a bar at the bottom
            of the screen on a phone (its own CSS). One instance at
            every width: crossing the line restyles it, never rebuilds
            its lines. */}
        <DispensingList
          isPhone={isPhone()}
          forName={unnamed() ? t('label.unnamed-patient') : patient()?.name}
          lines={lines}
          cardOf={cardOf}
          // A change to the list takes a message about it away, as adding
          // to it does (rules › dispensing the visit).
          onAmount={(itemId, units) => {
            setNotice(undefined);
            update(
              setAmount(lines, itemId, units, lineStock(itemId, units ?? 0))
            );
          }}
          onRemove={itemId => {
            setNotice(undefined);
            update(removeLine(lines, itemId));
          }}
          correctStock={{
            allowed: canCorrect(),
            open: (itemId, refocus) =>
              setCorrecting({ itemId, typed: 0, refocus }),
          }}
          onClear={() => (editing() ? discard() : void clear())}
          onDispense={() => void (editing() ? saveEdit() : dispense())}
          canDispense={canPress()}
          dispensing={dispensing()}
          looking={looking()}
          locked={locked()}
          notice={listNotice()}
          visit={openVisit()}
          editing={editingList()}
        />
      </div>
      <ConfirmDialog
        open={confirmingDelete() !== undefined}
        onClose={() => setConfirmingDelete(undefined)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-delete-dispense')}
        confirmVariant="danger"
        onConfirm={() => {
          // The visit being edited when Delete was pressed.
          const id = confirmingDelete();
          if (id !== undefined) void deleteEdited(id);
        }}
      />
      <ConfirmDialog
        open={confirmingCancel() !== undefined}
        onClose={() => setConfirmingCancel(undefined)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-cancel-prescription')}
        confirmVariant="danger"
        onConfirm={() => {
          // The visit Cancel was pressed on, never whichever is open now.
          const id = confirmingCancel();
          if (id !== undefined) void cancelOpened(id);
        }}
      />
      {/* Opens once its medicine's batches are in: at once from a card, a
          moment after the search for a medicine with no card. */}
      <Show when={asking() ? cardOf(asking()!) : undefined}>
        {card => (
          <AmountDialog
            card={card()}
            available={available(card())}
            locked={locked()}
            correctStock={{
              allowed: canCorrect(),
              open: (typed, refocus) =>
                setCorrecting({ itemId: card().item.id, typed, refocus }),
            }}
            onAdd={units => {
              addToList(card(), units);
              closeAmount();
            }}
            onClose={closeAmount}
          />
        )}
      </Show>
      {/* Over the amount box when opened from it, so it is rendered after. */}
      <Show when={correcting()} keyed>
        {opened => (
          <CorrectStockDialog
            storeId={storeOpened}
            itemId={opened.itemId}
            name={cardOf(opened.itemId)?.item.name ?? ''}
            unit={cardOf(opened.itemId)?.item.unitName ?? ''}
            // Closed without saving: the medicine is read again anyway, since
            // the dialog may have found the stock changed, or a save whose
            // reply was lost may have landed, and the screen should show it.
            onClose={() => {
              setCorrecting(undefined);
              void readAgain(opened.itemId);
            }}
            onSaved={count => corrected(opened, count)}
          />
        )}
      </Show>
    </Page>
  );
};

export default SimpleDispensingPage;
