import type { Component } from 'solid-js';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { DashboardBody } from './DashboardBody';

/*
 * The dashboard screen (spec/dashboard/ui-surface.md § S1).
 *
 * The page is the FRAME: the header and its breadcrumb, inside the app frame
 * and the navigation menu the shell owns. What fills the body is the body
 * region's answer — the built-in card grid of three widgets, or a plugin
 * contribution in place of the whole of it (§ body-region semantics) — and that
 * choice is `DashboardBody`'s. The frame is unchanged either way: a contributed
 * body fills the body only.
 */
const DashboardPage: Component = () => (
  <Page
    header={
      <Header>
        {/* The crumb is the destination's registry LABEL, which is Home —
            the same key the menu entry and the brand mark use. The vertical
            is still the dashboard; only what the user reads changed. */}
        <Breadcrumb crumbs={[{ label: t('label.home') }]} />
      </Header>
    }
  >
    <DashboardBody />
  </Page>
);

export default DashboardPage;
