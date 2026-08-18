import { lazy, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../intl';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { EmptyState } from '../ui/elements/feedback/EmptyState';
import { Button } from '../ui/elements/buttons/Button';
import { navTrail, type NavItem } from './navConfig';

// The not-found page's whimsy (issue #867) — the current app's lost-on-the-moon
// illustration. Lazy so its ~3 KB gzip rides in its own chunk, fetched only
// when a 404 actually renders; a fresh screen load, so suspending here loses
// no live state (kdd/solid-reactivity-pitfalls).
const UnhappyMan = lazy(() => import('../ui/icons/UnhappyMan'));

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

  // The destination itself, e.g. Stocktakes — the nav group it sits under is
  // never a crumb (ui-standards › layout, app bar). A not-found route has no
  // destination, so its single crumb is the "Not found" leaf.
  const crumbs = () => {
    const trail = props.dest ? navTrail(props.dest.path) : [];
    const leaf = trail[trail.length - 1];
    if (leaf) return [{ label: t(leaf.labelKey) }];
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
        title={props.dest ? t('common.coming-soon') : t('heading.404')}
        illustration={props.dest ? undefined : <UnhappyMan />}
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
