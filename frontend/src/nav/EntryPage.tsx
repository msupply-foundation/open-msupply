import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../intl';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { EmptyState } from '../ui/elements/feedback/EmptyState';
import { Button } from '../ui/elements/buttons/Button';
import { navTrail, type NavItem } from './navConfig';

// The stand-in page for a nav destination with no section built yet, and for
// the router's catch-all (no `dest` → the not-found variant).
//
// It is a REAL page, not a bare heading: the Page frame + Header give it the
// same geometry and app bar as every built screen, which is also the only way
// into the menu at narrow widths (the hamburger renders inside the header) —
// without it the page is a dead end on phone/tablet. The body is the shared
// EmptyState, so "nothing here" looks the same everywhere.
//
// Labels are i18n keys resolved at render, so the page re-translates on a
// language switch (navConfig).
export const EntryPage: Component<{ dest?: NavItem }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // Section → destination, e.g. [Inventory, Stocktakes]. A not-found route has
  // no destination, so its single crumb is the "Not found" leaf.
  const crumbs = () => {
    const trail = props.dest ? navTrail(props.dest.path) : [];
    if (trail.length > 0)
      return trail.map(item => ({ label: t(item.labelKey) }));
    return [{ label: t(props.dest?.labelKey ?? 'heading.not-found') }];
  };

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
        </Header>
      }
    >
      <EmptyState
        title={props.dest ? t('common.coming-soon') : t('heading.not-found')}
        message={
          props.dest
            ? t('message.destination-not-built')
            : t('message.page-not-found')
        }
      >
        {/* The way out. The store root is the dashboard (App routes). */}
        <Show when={params.storeId}>
          <Button
            variant="ghost"
            onClick={() => navigate(`/${params.storeId}`)}
          >
            {t('error.go-to-dashboard')}
          </Button>
        </Show>
      </EmptyState>
    </Page>
  );
};
