import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import type { NavItem, NavLeaf } from '../ui/layout/AppShell/navModel';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { ThemeToggle } from '../ui/elements/buttons/ThemeToggle';
import { FileIcon, SlidersIcon } from '../ui/icons';
import { isRtl, locale, type LocaleKey } from '../intl';
import { prototypes } from './prototypes';
import { PrototypesIndex } from './PrototypesIndex';

/*
 * Prototypes shell — the sibling of src/ui-showcase/ShowcaseApp, and it
 * dogfoods the same real app chrome: the library's own <AppShell> (docked
 * MenuBar + the orange app footer) wrapping the prototype, so a prototype is
 * framed EXACTLY like an app page and only its body differs.
 *
 * It is a separate shell rather than a parameterised ShowcaseApp on purpose.
 * The two areas have opposite jobs (see prototypes.tsx), and the isolation rule
 * runs both ways: nothing here imports from src/ui-showcase/, and nothing there
 * imports from here. Sharing a shell would couple the citeable reference area
 * to the speculative one. The duplication is ~40 lines of chrome props.
 *
 * The active view lives in the URL hash (#/prototypes/<id>) so views are
 * linkable; AppShell's onNavigate writes the hash and a hashchange listener
 * owns the state — no routing library (the app's real router is not in play
 * here). Same approach as the showcase; see kdd/showcase-harness.
 */

/** The index page's own id — the landing view, and the hash's empty case. */
const INDEX_ID = 'index';

/*
 * The menu: the index as a leaf, then one leaf per prototype grouped under a
 * single expandable section. MenuBar resolves labelKey through t(), which falls
 * back to the key itself for unknown keys — so literal labels render verbatim.
 * Dev-only scaffolding; the cast stays contained here.
 */
const prototypesNav: NavItem[] = [
  {
    id: INDEX_ID,
    labelKey: 'All prototypes' as LocaleKey,
    to: `/prototypes/${INDEX_ID}`,
    icon: FileIcon,
  },
  {
    id: 'gallery',
    labelKey: 'Prototypes' as LocaleKey,
    to: '/prototypes/gallery',
    icon: SlidersIcon,
    children: prototypes.map(p => ({
      id: p.id,
      labelKey: p.title as LocaleKey,
      to: `/prototypes/${p.id}`,
    })),
  },
];

const viewFromHash = () => {
  const id = window.location.hash.replace(/^#\/?prototypes\/?/, '');
  return prototypes.some(p => p.id === id) ? id : INDEX_ID;
};

export function PrototypesApp() {
  const [activeId, setActiveId] = createSignal(viewFromHash());

  const onHashChange = () => setActiveId(viewFromHash());
  window.addEventListener('hashchange', onHashChange);
  onCleanup(() => window.removeEventListener('hashchange', onHashChange));

  const active = () => prototypes.find(p => p.id === activeId());

  /*
   * Document direction/lang, driven by the locale signal — mirrors App.tsx (the
   * app's single owner), which doesn't run on this branch. Here so a prototype
   * can be reviewed in RTL and under other locales' number/date formatting.
   */
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
  });

  // The hash stays the single source of truth: selecting a menu item writes it,
  // and the listener above updates the view.
  const select = (leaf: NavLeaf) => {
    window.location.hash = `#/prototypes/${leaf.id}`;
  };

  // AppShell reads only `.id` off `selected`, so the label is a formality.
  const selectedLeaf = (): NavLeaf => ({
    id: activeId(),
    labelKey: (active()?.title ?? 'All prototypes') as LocaleKey,
    to: `/prototypes/${activeId()}`,
  });

  // A fake sync run, so the footer cell's animated glyph behaves as in the app.
  const [demoSyncing, setDemoSyncing] = createSignal(false);
  let demoSyncTimer: number | undefined;
  const runDemoSync = () => {
    setDemoSyncing(true);
    demoSyncTimer = window.setTimeout(() => setDemoSyncing(false), 3_000);
  };
  onCleanup(() => clearTimeout(demoSyncTimer));

  return (
    <AppShell
      upper={prototypesNav}
      selected={selectedLeaf()}
      onNavigate={select}
      /*
       * The footer's store/user cells are inert placeholders — there is no store
       * or session here. The sync cell is the one exception: it has real state
       * to show, so "Sync now" runs a fake three-second run.
       */
      storeName="Demo store"
      onStoreClick={() => {}}
      syncStatus={{
        label: demoSyncing() ? 'Synchronising…' : 'Synced 3 minutes ago',
        tone: 'neutral',
      }}
      syncing={demoSyncing()}
      onSyncNow={runDemoSync}
      onSyncDetails={() => {}}
      username="Developer"
      displayName="Dev Eloper"
      email="dev.eloper@msupply.foundation"
      jobTitle="Product manager"
      onLogout={() => {}}
    >
      {/*
       * A prototype composes its OWN <Page> + <Header> — it IS a page — so it
       * drops straight into the shell's content slot. Only the index needs the
       * shell to supply a Page frame around it.
       */}
      <Show
        when={active()}
        fallback={
          <Page
            header={
              <Header>
                <Breadcrumb crumbs={[{ label: 'Prototypes' }]} />
                <HeaderButtons>
                  <ThemeToggle />
                </HeaderButtons>
              </Header>
            }
          >
            <PrototypesIndex />
          </Page>
        }
      >
        {prototype => <Dynamic component={prototype().component} />}
      </Show>
    </AppShell>
  );
}
