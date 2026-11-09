import { createMemo, createResource, For, Match, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import { t } from '@/intl';
import { prescriptionPreferences } from '@/store/storeContext';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { LinkButton } from '@/ui/elements/buttons/LinkButton';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { MenuLinesIcon } from '@/ui/icons';
import { SimpleDispensingItems } from './simpleDispensing.generated';
import { buildCards, type MedicineCard } from './simpleDispensingLogic';
import { MedicineCardView } from './MedicineCard';

/*
 * The Simple screen (spec/prescriptions ui-surface S9): the store's common
 * medicines as cards, each carrying its usual amounts. A second way into the
 * same dispensing records as the list, one press away from it and back.
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
      return buildCards(list, fetched);
    },
    undefined,
    { equals: sameFetchedValue }
  );

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
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('dispensing') }]} />
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
            // At most three columns, never narrower than three amount
            // buttons and the another-amount button need.
            <CardGrid minColumnWidth="max(17rem, calc((100% - 2 * var(--space-5)) / 3))">
              <For each={list()}>
                {card => (
                  // Pressing an amount dispenses it: the next step on #2188.
                  <MedicineCardView
                    card={card}
                    onAmount={() => {}}
                    onAskAmount={() => {}}
                  />
                )}
              </For>
            </CardGrid>
          )}
        </Match>
        <Match when={true}>
          <EmptyState graphic={false} message={t('loading')} />
        </Match>
      </Switch>
    </Page>
  );
};

export default SimpleDispensingPage;
