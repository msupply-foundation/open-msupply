import {
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from 'solid-js';
import type { Component } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import { useParams } from '@solidjs/router';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import { getCurrencyInfo, homeCurrency, locale, t } from '@/intl';
import { prescriptionPreferences } from '@/store/storeContext';
import { fetchPatientOptionById, type PatientOption } from '@/domain/patient';
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
import { CreatePatientModal } from '../../patients';
import { generateUUID } from '@/uuid';
import { SimpleDispensingItems } from './simpleDispensing.generated';
import {
  SimpleDispense,
  SimpleDispensedVisit,
} from './simpleDispense.generated';
import { AmountDialog } from './AmountDialog';
import {
  addAmount,
  buildCards,
  dispenseOutcome,
  dispenseVisit,
  medicinesFor,
  removeLine,
  setAmount,
  shortLines,
  unitsListed,
  unreadIds,
  visitWasSaved,
  type CardItem,
  type ListLine,
  type MedicineCard,
  type DispenseInput,
  type SaveReply,
  type VisitRecord,
} from './simpleDispensingLogic';
import { MedicineCardView } from './MedicineCard';
import { DispensingList } from './DispensingList';
import { StepHeading } from './StepHeading';
import { WhoIsItFor } from './WhoIsItFor';
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
  const recordsHref = () => `/${params.storeId}/dispensary/dispensing/records`;

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

  // Read again once a visit is dispensed (rules › dispensing the visit).
  // Always in the background: the search and the list work while the cards
  // load, so a visit may be on the screen by the time any read fails, and the
  // app's error dialog would offer a reload that loses it. A read that fails
  // keeps the cards as they were; with none yet, the card area says so and
  // offers to read them again.
  const [items, { refetch: refetchItems }] = createResource<
    CardItem[] | undefined,
    { storeId: string; ids: string[] }
  >(
    () => {
      const list = medicines();
      if (!list || list.length === 0) return false;
      return { storeId: params.storeId, ids: list.map(m => m.itemId) };
    },
    async ({ storeId, ids }, { value }) =>
      (await fetchItems(storeId, ids, true)) ?? value
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
      const fetched = gated(items);
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
  // price and stock. In the background: the screen says what a failure means
  // (searchFailed), and the app's error dialog would offer a reload that
  // loses the visit.
  const [searchedIds, setSearchedIds] = createSignal<string[]>([]);
  const [searchedItems, { mutate: setSearchedItems }] = createResource<
    CardItem[] | undefined,
    { storeId: string; ids: string[] }
  >(
    () => {
      const ids = searchedIds();
      return ids.length > 0 ? { storeId: params.storeId, ids } : false;
    },
    async ({ storeId, ids }, { value }) => {
      const fetched = await fetchItems(storeId, ids, true);
      if (fetched) return fetched;
      searchFailed(ids, unreadIds(ids, value));
      return value;
    }
  );
  const searched = createMemo<MedicineCard[]>(
    () => {
      const fetched = gated(searchedItems);
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
  const [checked, setChecked] = createSignal<MedicineCard[]>([]);

  const cardOf = (itemId: string) =>
    checked().find(card => card.item.id === itemId) ??
    cards()?.find(card => card.item.id === itemId) ??
    searched().find(card => card.item.id === itemId);
  const stockOf = (itemId: string) => cardOf(itemId)?.stock ?? 0;

  // Who the visit is for (rules › who it's for and the list): nothing can be
  // added until someone is chosen, and choosing someone else keeps the list.
  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = createSignal(false);
  // A patient just created comes back with its id and name only: read its
  // record so its code, date of birth and gender show like anyone else's.
  const showCreatedDetails = async (id: string) => {
    const full = await fetchPatientOptionById(params.storeId, id);
    if (full && patient()?.id === id) setPatient(full);
  };

  // The list: client state until the visit is dispensed. A store keyed by
  // medicine, so editing one line's amount never rebuilds its row.
  const [lines, setLines] = createStore<ListLine[]>([]);
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
  const [dispensing, setDispensing] = createSignal(false);
  const [notice, setNotice] = createSignal<
    { severity: 'success' | 'error'; text: string } | undefined
  >();
  // The visit's record (rules › dispensing the visit): its id, from its first
  // save until it is finished or the list is cleared, so a save repeated after
  // a lost reply can never make a second record; and, once a save's reply was
  // lost, who it was for, until the visit is finished. Read only by Dispense
  // and Clear, so not a signal.
  const visit: { current?: VisitRecord } = {};
  // A save whose reply never came may have gone through. Until Dispense finds
  // out, the visit can't be changed: only Dispense is offered.
  const [unconfirmed, setUnconfirmed] = createSignal(false);
  // Clear looking for a save whose reply was lost.
  const [looking, setLooking] = createSignal(false);
  // While a save is in flight or unconfirmed, nothing about the visit can
  // change: a press or an edit then would miss the save, or be cleared with
  // the list once it lands.
  const locked = () => dispensing() || unconfirmed() || looking();

  /** The list's medicines as the stock stands now. */
  const freshCards = async (
    listed: readonly ListLine[]
  ): Promise<MedicineCard[] | undefined> => {
    const ids = listed.map(line => line.itemId);
    // Background: a failed check is the screen's to report, and the app's
    // error dialog would offer a reload that loses the visit.
    const fetched = await fetchItems(params.storeId, ids, true);
    if (!fetched) return undefined;
    return buildCards(
      medicinesFor(ids, medicines() ?? []),
      fetched,
      prescriptionPreferences()
    );
  };

  const unsure = (): void => {
    setUnconfirmed(true);
    setNotice({ severity: 'error', text: t('error.dispense-unconfirmed') });
  };

  /** The visit is saved: ready the screen for the next person. */
  const finished = (who: { name: string }): void => {
    visit.current = undefined;
    setUnconfirmed(false);
    setChecked([]);
    update([]);
    setPatient(null);
    setSearchedIds([]);
    // The next visit reads its medicines afresh: none of this one's stock
    // stands in for them while that read is out, or after it fails.
    setSearchedItems(undefined);
    setNotice({
      severity: 'success',
      text: t('messages.dispensed-to', { name: who.name }),
    });
    void refetchItems();
  };

  /**
   * Whether an earlier save of this visit went through: undefined when the
   * server couldn't be asked. Quiet (background): the screen's own notice
   * says what a failed look means.
   */
  const savedEarlier = async (id: string): Promise<boolean | undefined> => {
    const found = await graphqlFetch(
      SimpleDispensedVisit,
      { storeId: params.storeId, id },
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
      { storeId: params.storeId, input },
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

  /** Check the list against the stock now; save it if it is all there. */
  const checkAndSave = async (): Promise<void> => {
    const who = patient();
    if (!who) return;
    setUnconfirmed(false);
    // The list as it stands now, so the check and the save are of the same
    // lines.
    const listed = lines.map(line => ({ ...line }));
    const end = await dispenseVisit(visit, who, listed, {
      look: savedEarlier,
      check: freshCards,
      save,
      before: cardOf,
      newId: generateUUID,
      // Prices compare to the store's currency's smallest unit, as shown.
      priceDecimals: getCurrencyInfo(homeCurrency(), locale()).decimals,
    });
    if (end.kind === 'saved') return finished(end.patient);
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
    const sentFor = visit.current?.sentFor;
    if (sentFor) {
      setLooking(true);
      const saved = await savedEarlier(visit.current!.id).finally(() =>
        setLooking(false)
      );
      if (saved === undefined) return unsure();
      if (saved) return finished(sentFor);
    }
    visit.current = undefined;
    update([]);
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
    setNotice(undefined);
    markRepriced([]);
    setDispensing(true);
    try {
      await checkAndSave();
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

  return (
    <Page
      // The cards and the list fill the body and own its scroll, so the list
      // can dock at its inline end, the body's full height.
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('dispensing') }]} />
          <WhoIsItFor
            storeId={params.storeId}
            patient={patient()}
            disabled={locked()}
            onSelect={chosen => {
              setNotice(undefined);
              setPatient(chosen);
            }}
            onCreatePatient={() => setCreatePatientOpen(true)}
          />
          {/* Staff can't switch screens (rules › the Simple screen): the list
              is where past records are found. Nothing on this screen's list
              goes with it: none of it was saved. */}
          <HeaderButtons>
            <LinkButton
              href={recordsHref()}
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
              patient() === null
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
              storeId={params.storeId}
              // The same medicines as the line editor's search.
              includeHiddenWithStock
              width="full"
              clearable={false}
              disabled={patient() === null || locked()}
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
                      canAdd={patient() !== null && !locked()}
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
          forName={patient()?.name}
          lines={lines}
          cardOf={cardOf}
          onAmount={(itemId, units) =>
            update(setAmount(lines, itemId, units, stockOf(itemId)))
          }
          onRemove={itemId => update(removeLine(lines, itemId))}
          onClear={() => void clear()}
          onDispense={() => void dispense()}
          canDispense={patient() !== null}
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
            onAdd={units => {
              addToList(card(), units);
              closeAmount();
            }}
            onClose={closeAmount}
          />
        )}
      </Show>
      {/* Create-patient-on-no-match, as on the create flow: on success the
          new patient is the one the visit is for. Mounted only while open,
          so its test ids are never on the page twice (e2e/TESTIDS.md). */}
      <Show when={createPatientOpen()}>
        <CreatePatientModal
          open
          storeId={params.storeId}
          onClose={() => setCreatePatientOpen(false)}
          onCreated={created => {
            setPatient(created);
            setCreatePatientOpen(false);
            void showCreatedDetails(created.id);
          }}
        />
      </Show>
    </Page>
  );
};

export default SimpleDispensingPage;
