import {
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
  untrack,
} from 'solid-js';
import type { Component } from 'solid-js';
import { produce, reconcile } from 'solid-js/store';
import { useParams } from '@solidjs/router';
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
  localisedTime,
  roundedText,
  t,
} from '@/intl';
import { hasPermission, prescriptionPreferences } from '@/store/storeContext';
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
import { ClockIcon } from '@/ui/icons';
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
import { MedicineCardView } from './MedicineCard';
import { DispensingList } from './DispensingList';
import { StepHeading } from './StepHeading';
import { WhoIsItFor } from './WhoIsItFor';
import { leaveVisit, visitFor } from './keptVisit';
import styles from './SimpleDispensing.module.css';

/*
 * The Simple screen (spec/prescriptions ui-surface S9): the store's common
 * medicines as cards, each carrying its usual amounts, and the list for the
 * person at the counter beside them. Dispensing opens on it in a store whose
 * dispensing screen is Simple; staff can't switch to the list's screen, and
 * reach past records through Dispensing records.
 */
const SimpleDispensingPage: Component = () => {
  const params = useParams<{ storeId: string }>();
  // The store the screen opened in, read once: a store switch remounts the
  // screen. Every request uses it, never the route's params, which are the
  // router's and follow the address: a save still out when staff switch
  // store must still go to the store it was dispensed in.
  const storeOpened = untrack(() => params.storeId);
  const recordsHref = `/${storeOpened}/dispensary/dispensing/records`;

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
  } = visitState;
  const visit = visitState.record;

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
      return buildCards(list, fetched, prescriptionPreferences());
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
      return buildCards(
        medicinesFor(searchedIds(), []),
        fetched ?? [],
        prescriptionPreferences()
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

  // Who the visit is for (rules › who it's for and the list): nothing can be
  // added until someone is chosen, and choosing someone else keeps the list.
  // Or the store's unnamed patient (rules › the unnamed patient). Both are
  // the kept visit's. Chosen only while the store still uses it: if sync
  // turns the setting off mid-visit, nobody is chosen and the list stays, so
  // the visit can't be dispensed to it.
  const unnamed = () =>
    unnamedStillChosen(unnamedPicked(), prescriptionPreferences());
  const chosen = () => unnamed() || patient() !== null;
  const chooseUnnamed = (on: boolean) => {
    setNotice(undefined);
    setPatient(null);
    setUnnamed(on);
  };
  // The patient search hands back an id and name only, for someone found or
  // just created: read the record so their code, date of birth and gender
  // show.
  const showDetails = async (id: string) => {
    const full = await fetchPatientOptionById(storeOpened, id);
    if (full && patient()?.id === id) setPatient(full);
  };

  // The list: client state until the visit is dispensed, the kept visit's.
  const update = (next: ListLine[]) =>
    setLines(reconcile(next, { key: 'itemId' }));
  // Below zero once the check finds less stock than the list holds: the card
  // then says how much it is short.
  const available = (card: MedicineCard) =>
    round9(stockOf(card.item.id) - unitsListed(lines, card.item.id));
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
    settings: Settings
  ): Promise<MedicineCard[] | undefined> => {
    const ids = listed.map(line => line.itemId);
    // Background: a failed check is the screen's to report, and the app's
    // error dialog would offer a reload that loses the visit.
    const fetched = await fetchItems(storeOpened, ids, true);
    if (!fetched) return undefined;
    return buildCards(
      medicinesFor(ids, settings.medicines),
      fetched,
      settings.prefs
    );
  };

  const unsure = (): void => {
    setUnconfirmed(true);
    setNotice({ severity: 'error', text: t('error.dispense-unconfirmed') });
  };

  /** The visit is saved: ready the screen for the next person. */
  const finished = (who: DispensedTo, settings: Settings): void => {
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

  // Lines holding more than the stock now shows, and lines whose price
  // changed. While there are any (and Dispense isn't checking again), the
  // notice that the visit wasn't dispensed, naming each of them.
  const short = () => shortLines(lines, stockOf);
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
          <Breadcrumb crumbs={[{ label: t('dispensing') }]} />
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
          {/* Staff can't switch screens (rules › the Simple screen): the list
              is where past records are found. Nothing on this screen's list
              goes with it: none of it was saved. */}
          <HeaderButtons>
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
            hint={
              !chosen()
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
              disabled={!chosen() || locked()}
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
                      canAdd={chosen() && !locked()}
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
            update(setAmount(lines, itemId, units, stockOf(itemId)));
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
          onClear={() => void clear()}
          onDispense={() => void dispense()}
          canDispense={chosen()}
          dispensing={dispensing()}
          looking={looking()}
          locked={locked()}
          notice={shownNotice()}
        />
      </div>
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
