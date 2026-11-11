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
import { SimpleDispensingItems } from './simpleDispensing.generated';
import {
  addAmount,
  buildCards,
  removeLine,
  setAmount,
  unitsListed,
  type ListLine,
  type MedicineCard,
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

  const [items] = createResource(
    () => {
      const list = medicines();
      if (!list || list.length === 0) return false;
      return { storeId: params.storeId, ids: list.map(m => m.itemId) };
    },
    async ({ storeId, ids }) => {
      const result = await graphqlFetch(SimpleDispensingItems, {
        storeId,
        ids,
        page: { first: ids.length },
      });
      if (result.kind !== 'success') return undefined;
      return result.data.items.__typename === 'ItemConnector'
        ? result.data.items.nodes
        : undefined;
    }
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
            onSelect={setPatient}
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
                        onAmount={(_, amount) =>
                          update(
                            addAmount(lines, card.item.id, amount, card.stock)
                          )
                        }
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
              />
            </div>
          )}
        </Match>
        <Match when={true}>
          <EmptyState graphic={false} message={t('loading')} />
        </Match>
      </Switch>
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
