// The browser tab's title (spec/chrome § document title). One screen, one
// title: each screen names ITSELF by calling createDocumentTitle — the routed
// app shell for every in-store destination, and the pre-session screens
// (login, initialisation) for their own. Nothing sets it centrally: a single
// owner would have to know which screen is showing, which is exactly what the
// router and the phase switch already decide.

import { createEffect } from 'solid-js';
import { t, type LocaleKey } from './intl';
import { navTrail } from './nav/navConfig';
import { findLeafByPath } from './ui/layout/AppShell/navModel';

/**
 * "<Screen> | Open mSupply" — the screen leads, because a tab strip truncates
 * the end of a title and the app name is the half every tab repeats. A screen
 * with no name of its own (an off-registry path) is the app name alone.
 */
export const pageTitle = (screenKey: LocaleKey | undefined): string =>
  screenKey ? `${t(screenKey)} | ${t('app')}` : t('app');

/**
 * The key naming the screen at a store-relative path ('' = the store root =
 * the dashboard); absent for a path that is no destination.
 *
 * Derived from the same registry the menu and the breadcrumb read
 * (spec/navigation § one registry): the destination's own menu label, or — for
 * a record screen, which has no entry of its own — the label of the entry it
 * sits beneath, resolved exactly as the menu highlight resolves it.
 */
export const screenTitleKey = (relativePath: string): LocaleKey | undefined => {
  const path = relativePath || 'dashboard';
  const trail = navTrail(path);
  return trail[trail.length - 1]?.labelKey ?? findLeafByPath(path)?.labelKey;
};

/**
 * Keeps `document.title` in step with the screen. Reactive in both its inputs —
 * the screen itself (a route change re-runs it) and the active locale (t()
 * reads the locale signal) — so the tab re-translates on a language switch like
 * every other surface.
 */
export const createDocumentTitle = (
  screenKey: () => LocaleKey | undefined
): void => {
  createEffect(() => {
    document.title = pageTitle(screenKey());
  });
};
