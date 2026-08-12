import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { sections, categories } from './sections';
import { AppShell } from '../ui/layout/AppShell/AppShell';
import type { NavItem, NavLeaf } from '../ui/layout/AppShell/navModel';
import { Page } from '../ui/layout/Page/Page';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { ThemeToggle } from '../ui/elements/buttons/ThemeToggle';
import { isRtl, locale, type LocaleKey } from '../intl';

/*
 * Storybook shell: the showcase dogfoods the REAL app chrome — it renders the
 * library's own <AppShell> (docked MenuBar + the orange app footer with its
 * store / user / language cells) wrapping a <Page> whose header is the real
 * <Header>, so a showcase view is composed EXACTLY like an app page and only
 * the body content differs. AppShell takes the section registry as its nav
 * model (its `upper` override); the footer's store/user cells are inert demo
 * placeholders (there is no store or session here). The one app-chrome control
 * the real app lacks — a dark-mode ThemeToggle — lives in the page header's
 * button cluster. Everything in src/ui-showcase/ is demo scaffolding — the
 * reusable library (src/ui/) and the app never import from here; the ONLY entry
 * is the dev-only #/showcase branch in src/index.tsx, dead-code-eliminated from
 * production builds (see README.md here).
 *
 * The active section lives in the URL hash (#/showcase/buttons) so views are
 * linkable — AppShell's onNavigate just writes the hash and a hashchange
 * listener owns the state, no routing library (the app's real router is not in
 * play here; see kdd/showcase-harness).
 */

/* The showcase's nav model: one expandable section per category, plus any
 * top-level sections as standalone leaf entries (e.g. Icons) listed after the
 * groups. MenuBar resolves labelKey through t(), which falls back to the key
 * itself for unknown keys — so passing our literal section labels as "keys"
 * renders them verbatim. Dev-only scaffolding; the cast stays contained here. */
const topLevelNav: NavItem[] = sections
  .filter(s => s.topLevel)
  .map(s => ({
    id: s.id,
    labelKey: s.label as LocaleKey,
    to: `/showcase/${s.id}`,
    icon: s.icon!,
  }));

const groupNav: NavItem[] = categories.map(c => ({
  id: c.id,
  labelKey: c.label as LocaleKey,
  to: `/showcase/${c.id}`,
  icon: c.icon,
  children: sections
    .filter(s => s.category === c.id)
    .map(s => ({
      id: s.id,
      labelKey: s.label as LocaleKey,
      to: `/showcase/${s.id}`,
    })),
}));

const showcaseNav: NavItem[] = [...groupNav, ...topLevelNav];

const sectionFromHash = () => {
  const id = window.location.hash.replace(/^#\/?showcase\/?/, '');
  return sections.some(s => s.id === id) ? id : sections[0].id;
};

// Find the nearest scrollable ancestor of `el` — the Page frame's overflow:auto
// body in the showcase's shell — by walking up; undefined if none.
const scrollableAncestor = (
  el: HTMLElement | undefined
): HTMLElement | undefined => {
  let node = el?.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return undefined;
};

export function ShowcaseApp() {
  const [activeId, setActiveId] = createSignal(sectionFromHash());
  // A transparent (display: contents) anchor inside the Page body, so the
  // effect below can find the scrolling body and reset it on a section switch.
  let contentBodyAnchor: HTMLDivElement | undefined;

  const onHashChange = () => setActiveId(sectionFromHash());
  window.addEventListener('hashchange', onHashChange);
  onCleanup(() => window.removeEventListener('hashchange', onHashChange));

  const active = () => sections.find(s => s.id === activeId())!;

  // Document direction/lang, driven by the locale signal — mirrors App.tsx
  // (the app's single owner), which doesn't run in the showcase branch. Here
  // so the footer's LanguageSelector demonstrates RTL layout + locale
  // formatting (numbers, dates) across every section.
  createEffect(() => {
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
    document.documentElement.lang = locale();
  });

  // Switching sections must land at the TOP of the new page. Every non-fill
  // section renders inside ONE persistent <Page> — only the <Dynamic> body
  // swaps — so the scrolling body would otherwise keep the previous section's
  // scroll offset. The real app resets scroll via @solidjs/router on route
  // change; the hash-nav showcase does it here. (A fill section mounts its own
  // fresh Page and starts at the top; the anchor is then detached, so
  // scrollableAncestor returns undefined and this is a no-op.)
  createEffect(() => {
    activeId(); // re-run on every section switch
    scrollableAncestor(contentBodyAnchor)?.scrollTo({ top: 0 });
  });

  // The hash stays the single source of truth: selecting a menu item writes
  // it, and the hashchange listener above updates the view.
  const select = (leaf: NavLeaf) => {
    window.location.hash = `#/showcase/${leaf.id}`;
  };

  // The menu highlight is driven by the active section's id; AppShell reads
  // only `.id` off `selected`, so the label is a formality (cast, as above).
  const selectedLeaf = (): NavLeaf => ({
    id: activeId(),
    labelKey: active().label as LocaleKey,
    to: `/showcase/${activeId()}`,
  });

  // The page header's breadcrumb stands in for the app's route trail: the
  // section's category is the root crumb and the section its (h1) leaf —
  // top-level sections (Icons) are a single crumb. The leading orange icon is
  // the category's (or the top-level section's own).
  const crumbs = () => {
    const s = active();
    const cat = categories.find(c => c.id === s.category);
    return cat
      ? [{ label: cat.label }, { label: s.label }]
      : [{ label: s.label }];
  };
  // A memo so the two reads Breadcrumb makes of `icon` (its truthiness gate +
  // the insertion) share ONE element rather than building the icon subtree
  // twice (kdd/solid-reactivity-pitfalls §3).
  const crumbIcon = createMemo(() => {
    const s = active();
    const Icon = s.topLevel
      ? s.icon
      : categories.find(c => c.id === s.category)?.icon;
    return Icon ? <Dynamic component={Icon} /> : undefined;
  });

  return (
    <AppShell
      // The showcase's own menu (section registry) replaces the app's navModel;
      // it has no lower cluster, so `lower` is omitted.
      upper={showcaseNav}
      selected={selectedLeaf()}
      onNavigate={select}
      // The footer's store/user cells are inert demo placeholders — there is no
      // store or session in the standalone showcase; the language cell is live.
      storeName="Demo store"
      onStoreClick={() => {}}
      username="Developer"
      displayName="Dev Eloper"
      email="dev.eloper@msupply.foundation"
      jobTitle="Product manager"
      onLogout={() => {}}
    >
      {/* A `fill` section (Table) is a real full-height page that composes its
          OWN <Page> + <Header>, so it drops straight into the shell's content
          slot. Every other section is body content the showcase wraps in a
          <Page> whose header carries the breadcrumb + the dark-mode toggle. */}
      <Show
        when={!active().fill}
        fallback={<Dynamic component={active().component} />}
      >
        <Page
          header={
            <Header>
              <Breadcrumb icon={crumbIcon()} crumbs={crumbs()} />
              <HeaderButtons>
                <ThemeToggle />
              </HeaderButtons>
            </Header>
          }
        >
          <div style={{ display: 'contents' }} ref={contentBodyAnchor}>
            <Dynamic component={active().component} />
          </div>
        </Page>
      </Show>
    </AppShell>
  );
}
