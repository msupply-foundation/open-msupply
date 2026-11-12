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
import { createStore, reconcile } from 'solid-js/store';
import { useParams } from '@solidjs/router';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import { t } from '@/intl';
import { prescriptionPreferences } from '@/store/storeContext';
import { fetchPatientOptionById, type PatientOption } from '@/domain/patient';
import { ItemSearch } from '@/domain/item';
import { round9 } from '@/domain/allocation';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { LinkButton } from '@/ui/elements/buttons/LinkButton';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { MenuLinesIcon } from '@/ui/icons';
import { useIsCompact } from '@/ui/utils/createMediaQuery';
import { CreatePatientModal } from '../../patients';
import { generateUUID } from '@/uuid';
import { SimpleDispensingItems } from './simpleDispensing.generated';
import {
  SimpleDispense,
  SimpleDispensedVisit,
} from './simpleDispense.generated';
import { ReducedStockDialog } from './ReducedStockDialog';
import { AmountDialog } from './AmountDialog';
import {
  addAmount,
  buildCards,
  dispenseInput,
  dispenseOutcome,
  medicinesFor,
  reduceToAvailable,
  removeLine,
  setAmount,
  shortfalls,
  unitsListed,
  visitWasSaved,
  type CardItem,
  type ListLine,
  type MedicineCard,
  type Shortfall,
} from './simpleDispensingLogic';
import { MedicineCardView } from './MedicineCard';
import { DispensingList } from './DispensingList';
import { StepHeading } from './StepHeading';
import { WhoIsItFor } from './WhoIsItFor';
import styles from './SimpleDispensing.module.css';

/*
 * The Simple screen (spec/prescriptions ui-surface S9): the store's common
 * medicines as cards, each carrying its usual amounts, and the list for the
 * person at the counter beside them. A second way into the same dispensing
 * records as the Standard list, one press away from it and back.
 */
const SimpleDispensingPage: Component = () => {
  const params = useParams<{ storeId: string }>();
  const listHref = () => `/${params.storeId}/dispensary/dispensing`;

  // Undefined until the store context resolves, so "loading" is never shown
  // as "none set up".
  const medicines = () => prescriptionPreferences().commonMedicines;

  // The cards' items: on load, and again when Dispense checks the stock.
  const fetchItems = async (
    storeId: string,
    ids: string[]
  ): Promise<CardItem[] | undefined> => {
    const result = await graphqlFetch(SimpleDispensingItems, {
      storeId,
      ids,
      page: { first: ids.length },
    });
    if (result.kind !== 'success') return undefined;
    return result.data.items.__typename === 'ItemConnector'
      ? result.data.items.nodes
      : undefined;
  };

  const [items, { refetch: refetchItems }] = createResource(
    () => {
      const list = medicines();
      if (!list || list.length === 0) return false;
      return { storeId: params.storeId, ids: list.map(m => m.itemId) };
    },
    ({ storeId, ids }) => fetchItems(storeId, ids)
  );

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
  const [searchedIds, setSearchedIds] = createSignal<string[]>([]);
  const [searchedItems] = createResource(
    () => {
      const ids = searchedIds();
      return ids.length > 0 ? { storeId: params.storeId, ids } : false;
    },
    ({ storeId, ids }) => fetchItems(storeId, ids)
  );
  const searched = createMemo<MedicineCard[]>(
    () =>
      buildCards(
        medicinesFor(searchedIds(), []),
        gated(searchedItems) ?? [],
        prescriptionPreferences()
      ),
    [],
    { equals: sameFetchedValue }
  );

  const cardOf = (itemId: string) =>
    cards()?.find(card => card.item.id === itemId) ??
    searched().find(card => card.item.id === itemId);

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
  const available = (card: MedicineCard) =>
    round9(card.stock - unitsListed(lines, card.item.id));
  const addToList = (card: MedicineCard, units: number) => {
    setNotice(undefined);
    update(addAmount(lines, card.item.id, units, card.stock));
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

  // A phone (spec ui-surface S9 › layout): one-row cards, and the list as a
  // bar at the bottom of the screen. Which layout renders, not spacing.
  const isPhone = useIsCompact();

  // Dispense (rules › dispensing the visit): check the stock again, show
  // what has to be reduced if anything ran out, then save the whole visit in
  // one transaction and clear the screen for the next person.
  const [dispensing, setDispensing] = createSignal(false);
  const [notice, setNotice] = createSignal<
    { severity: 'success' | 'error'; text: string } | undefined
  >();
  const [review, setReview] = createSignal<
    { short: Shortfall[]; fresh: MedicineCard[] } | undefined
  >();
  // The visit's record id, from its first save until it is saved or the list
  // is cleared: a save repeated after a lost reply reuses it, so the visit
  // can never be saved twice.
  let visitId: string | undefined;
  // A save whose reply never came may have gone through. Until Dispense finds
  // out, the visit can't be changed: only Dispense is offered.
  const [unconfirmed, setUnconfirmed] = createSignal(false);
  // While a save is in flight or unconfirmed, nothing about the visit can
  // change: a press or an edit then would miss the save, or be cleared with
  // the list once it lands.
  const locked = () => dispensing() || unconfirmed();

  /** The list's medicines as the stock stands now. */
  const freshCards = async (
    listed: readonly ListLine[]
  ): Promise<MedicineCard[] | undefined> => {
    const ids = listed.map(line => line.itemId);
    const fetched = await fetchItems(params.storeId, ids);
    if (!fetched) return undefined;
    return buildCards(
      medicinesFor(ids, medicines() ?? []),
      fetched,
      prescriptionPreferences()
    );
  };

  const failed = (): void => {
    setNotice({ severity: 'error', text: t('error.dispense-failed') });
  };
  const unsure = (): void => {
    setUnconfirmed(true);
    setNotice({ severity: 'error', text: t('error.dispense-unconfirmed') });
  };

  /** The visit is saved: ready the screen for the next person. */
  const finished = (who: PatientOption): void => {
    visitId = undefined;
    setUnconfirmed(false);
    update([]);
    setPatient(null);
    setSearchedIds([]);
    setNotice({
      severity: 'success',
      text: t('messages.dispensed-to', { name: who.name }),
    });
    void refetchItems();
  };

  /** Check the list against the stock now; save it if it is all there. */
  const checkAndSave = async (retried = false): Promise<void> => {
    const who = patient();
    if (!who) return;
    // A save whose reply was lost: find out whether it went through before
    // saving anything again.
    if (unconfirmed() && visitId) {
      const visit = await graphqlFetch(SimpleDispensedVisit, {
        storeId: params.storeId,
        id: visitId,
      });
      if (visit.kind !== 'success') return unsure();
      if (visitWasSaved(visit.data.invoice)) return finished(who);
      setUnconfirmed(false);
    }
    // The list as it stands now, so the check and the save are of the same
    // lines.
    const listed = lines.map(line => ({ ...line }));
    const fresh = await freshCards(listed);
    if (!fresh) return failed();
    const short = shortfalls(listed, fresh);
    if (short.length > 0) {
      setReview({ short, fresh });
      return;
    }
    visitId ??= generateUUID();
    const input = dispenseInput(visitId, who.id, listed, fresh, generateUUID);
    const result = await graphqlFetch(
      SimpleDispense,
      { storeId: params.storeId, input },
      { returnGraphqlErrors: true }
    );
    switch (result.kind) {
      case 'success':
        break;
      case 'graphqlError':
        // The server answered and refused, so nothing was saved. Missing
        // permission gets the app's own permission-denied message as well.
        if (isForbidden(result.errors))
          reportPermissionDenied(missingPermissions(result.errors));
        return failed();
      case 'unexpectedError':
        // The reply never came, or couldn't be read: the save may have gone
        // through.
        return unsure();
      default:
        return failed();
    }
    const outcome = dispenseOutcome(
      result.data.batchPrescription,
      input.insertPrescriptionLines.length
    );
    // The stock moved between the check and the save: nothing was saved, so
    // check again (once) and show what has to be reduced.
    if (outcome === 'line-refused')
      return retried ? failed() : checkAndSave(true);
    if (outcome === 'refused') return failed();
    finished(who);
  };

  const dispense = async () => {
    setNotice(undefined);
    setDispensing(true);
    try {
      await checkAndSave();
    } finally {
      setDispensing(false);
    }
  };

  /** Bring the short lines down to what is available, or remove them. */
  const applyReview = (): void => {
    const pending = review();
    if (!pending) return;
    update(reduceToAvailable(lines, pending.short));
    setReview(undefined);
    // The cards follow the stock as it now is.
    void refetchItems();
  };

  const standardView = (variant: 'secondary' | 'ghost') => (
    <LinkButton
      href={listHref()}
      variant={variant}
      icon={variant === 'ghost' ? undefined : <MenuLinesIcon />}
      data-testid={
        variant === 'ghost'
          ? 'nothing-here-standard-view-button'
          : 'standard-view-button'
      }
    >
      {t('button.standard-view')}
    </LinkButton>
  );

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
          <HeaderButtons>{standardView('secondary')}</HeaderButtons>
        </Header>
      }
    >
      <Switch>
        <Match when={medicines()?.length === 0 || cards()?.length === 0}>
          <EmptyState
            // Set up but none of them dispensable here any more is a
            // different fix from none set up, so it says which.
            message={t(
              medicines()?.length === 0
                ? 'messages.no-common-medicines'
                : 'messages.no-common-medicines-dispensable'
            )}
            data-testid="nothing-here"
          >
            {standardView('ghost')}
          </EmptyState>
        </Match>
        <Match when={cards()}>
          {list => (
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
                <CardGrid
                  equalHeight
                  // Dimmed until someone is chosen: nothing here can be
                  // pressed yet (the buttons are disabled too).
                  class={patient() === null ? styles.waiting : undefined}
                  minColumnWidth="max(17rem, calc((100% - 2 * var(--space-5)) / 3))"
                >
                  <For each={list()}>
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
                  update(
                    setAmount(lines, itemId, units, cardOf(itemId)?.stock ?? 0)
                  )
                }
                onRemove={itemId => update(removeLine(lines, itemId))}
                onClear={() => {
                  visitId = undefined;
                  update([]);
                }}
                onDispense={() => void dispense()}
                canDispense={patient() !== null}
                dispensing={dispensing()}
                locked={locked()}
                notice={notice()}
              />
            </div>
          )}
        </Match>
        <Match when={true}>
          <EmptyState graphic={false} message={t('loading')} />
        </Match>
      </Switch>
      {/* Opens once its medicine's batches are in: at once from a card, a
          moment after the search for a medicine with no card. */}
      <Show when={asking() ? cardOf(asking()!) : undefined}>
        {card => (
          <AmountDialog
            card={card()}
            available={available(card())}
            onAdd={units => {
              addToList(card(), units);
              closeAmount();
            }}
            onClose={closeAmount}
          />
        )}
      </Show>
      <Show when={review()}>
        {pending => (
          <ReducedStockDialog
            short={pending().short}
            cardOf={cardOf}
            canDispense={reduceToAvailable(lines, pending().short).length > 0}
            onGoBack={applyReview}
            onDispense={() => {
              applyReview();
              void dispense();
            }}
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
