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
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import { t } from '@/intl';
import { prescriptionPreferences } from '@/store/storeContext';
import type { PatientOption } from '@/domain/patient';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { LinkButton } from '@/ui/elements/buttons/LinkButton';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { MenuLinesIcon } from '@/ui/icons';
import { CreatePatientModal } from '../../patients';
import { generateUUID } from '@/uuid';
import { SimpleDispensingItems } from './simpleDispensing.generated';
import { SimpleDispense } from './simpleDispense.generated';
import { ReducedStockDialog } from './ReducedStockDialog';
import {
  addAmount,
  buildCards,
  dispenseInput,
  reduceToAvailable,
  removeLine,
  setAmount,
  shortfalls,
  unitsListed,
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
  const cardOf = (itemId: string) =>
    cards()?.find(card => card.item.id === itemId);

  // Who the visit is for (rules › who it's for and the list): nothing can be
  // added until someone is chosen, and choosing someone else keeps the list.
  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = createSignal(false);

  // The list: client state until the visit is dispensed. A store keyed by
  // medicine, so editing one line's amount never rebuilds its row.
  const [lines, setLines] = createStore<ListLine[]>([]);
  const update = (next: ListLine[]) =>
    setLines(reconcile(next, { key: 'itemId' }));
  const available = (card: MedicineCard) =>
    card.stock - unitsListed(lines, card.item.id);

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

  /** The list's medicines as the stock stands now. */
  const freshCards = async (): Promise<MedicineCard[] | undefined> => {
    const list = medicines() ?? [];
    const ids = lines.map(line => line.itemId);
    const fetched = await fetchItems(params.storeId, ids);
    if (!fetched) return undefined;
    return buildCards(
      list.filter(m => ids.includes(m.itemId)),
      fetched,
      prescriptionPreferences()
    );
  };

  const failed = (): void => {
    setNotice({ severity: 'error', text: t('error.dispense-failed') });
  };

  /** Check the list against the stock now; save it if it is all there. */
  const checkAndSave = async (retried = false): Promise<void> => {
    const who = patient();
    if (!who) return;
    const fresh = await freshCards();
    if (!fresh) return failed();
    const short = shortfalls(lines, fresh);
    if (short.length > 0) {
      setReview({ short, fresh });
      return;
    }
    const prescriptionId = generateUUID();
    const result = await graphqlFetch(
      SimpleDispense,
      {
        storeId: params.storeId,
        input: dispenseInput(
          prescriptionId,
          who.id,
          [...lines],
          fresh,
          generateUUID
        ),
      },
      { returnGraphqlErrors: true }
    );
    if (result.kind !== 'success') return failed();
    const lineRefused = (
      result.data.batchPrescription.insertPrescriptionLines ?? []
    ).some(line => line.response.__typename === 'InsertPrescriptionLineError');
    // The stock moved between the check and the save: nothing was saved, so
    // check again (once) and show what has to be reduced.
    if (lineRefused) return retried ? failed() : checkAndSave(true);
    update([]);
    setPatient(null);
    setNotice({
      severity: 'success',
      text: t('messages.dispensed-to', { name: who.name }),
    });
    void refetchItems();
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
            message={t('messages.no-common-medicines')}
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
                        canAdd={patient() !== null}
                        onAmount={(_, amount) => {
                          setNotice(undefined);
                          update(
                            addAmount(lines, card.item.id, amount, card.stock)
                          );
                        }}
                        // Another amount: the next step on #2188.
                        onAskAmount={() => {}}
                      />
                    )}
                  </For>
                </CardGrid>
              </div>
              {/* Docked at the columns' inline end (its own CSS). */}
              <DispensingList
                forName={patient()?.name}
                lines={lines}
                cardOf={cardOf}
                onAmount={(itemId, units) =>
                  update(
                    setAmount(lines, itemId, units, cardOf(itemId)?.stock ?? 0)
                  )
                }
                onRemove={itemId => update(removeLine(lines, itemId))}
                onClear={() => update([])}
                onDispense={() => void dispense()}
                canDispense={patient() !== null}
                dispensing={dispensing()}
                notice={notice()}
              />
            </div>
          )}
        </Match>
        <Match when={true}>
          <EmptyState graphic={false} message={t('loading')} />
        </Match>
      </Switch>
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
          }}
        />
      </Show>
    </Page>
  );
};

export default SimpleDispensingPage;
