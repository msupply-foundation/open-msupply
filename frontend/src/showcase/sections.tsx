import type { Component } from 'solid-js'
import { SlidersIcon, CopyIcon, FileIcon, type IconProps } from '../components/icons'
import { TypographyShowcase } from './TypographyShowcase'
import { ButtonsShowcase } from './ButtonsShowcase'
import { InputsShowcase } from './InputsShowcase'
import { SelectorsShowcase } from './SelectorsShowcase'
import { FeedbackShowcase } from './FeedbackShowcase'
import { HeaderShowcase } from './HeaderShowcase'
import { TabBarShowcase } from './TabBarShowcase'
import { ContentFooterShowcase } from './ContentFooterShowcase'
import { SidePanelShowcase } from './SidePanelShowcase'
import { Home } from '../pages/Home/Home'
import { Login } from '../pages/Login/Login'
import { OutboundShipments } from '../pages/OutboundShipments/OutboundShipments'

export type SectionCategory = 'components' | 'layout' | 'pages'

export type SectionDef = {
  id: string
  label: string
  component: Component
  /** Which menu-bar group the section lists under. */
  category: SectionCategory
  /*
   * 'component' (default) renders inside the padded showcase panel. 'app'
   * renders full-bleed with NO showcase chrome at all — a real app page
   * exactly as a build would ship it; the way back is the browser's Back
   * button. See ShowcaseApp.tsx.
   */
  kind?: 'component' | 'app'
}

/*
 * The menu-bar groups the sections divide into (Carl, 2026-07-08): basic
 * components / layout elements / real full pages. The showcase shell derives
 * its MenuBar nav model from this list + the registry below.
 */
export const categories: { id: SectionCategory; label: string; icon: Component<IconProps> }[] = [
  { id: 'components', label: 'Components', icon: SlidersIcon },
  { id: 'layout', label: 'Layout Elements', icon: CopyIcon },
  { id: 'pages', label: 'Full page', icon: FileIcon },
]

const ComingSoon: Component = () => (
  <p>Nothing here yet — components land here as they're built.</p>
)

/*
 * The storybook's section registry. Adding a section = add an entry here;
 * the shell derives the menu (grouped by category) and panels from this list.
 * Section id doubles as the URL hash (#/buttons), so sections are linkable.
 */
export const sections: SectionDef[] = [
  { id: 'typography', label: 'Typography', component: TypographyShowcase, category: 'components' },
  { id: 'buttons', label: 'Buttons', component: ButtonsShowcase, category: 'components' },
  { id: 'inputs', label: 'Inputs', component: InputsShowcase, category: 'components' },
  { id: 'selectors', label: 'Selectors', component: SelectorsShowcase, category: 'components' },
  { id: 'tab-bar', label: 'Tab bar', component: TabBarShowcase, category: 'components' },
  { id: 'feedback', label: 'Feedback', component: FeedbackShowcase, category: 'components' },
  { id: 'table', label: 'Table', component: ComingSoon, category: 'components' },
  { id: 'header', label: 'Header', component: HeaderShowcase, category: 'layout' },
  { id: 'content-footer', label: 'Content footer', component: ContentFooterShowcase, category: 'layout' },
  { id: 'side-panel', label: 'Side panel', component: SidePanelShowcase, category: 'layout' },
  // The 'pages' group holds REAL pages (src/pages/ — imports only from the
  // library), registered here so they're reachable and testable; they also
  // exercise AppShell exactly as the app will ship it (the separate App
  // shell demo section retired in their favour — Carl, 2026-07-08).
  { id: 'home', label: 'Home', component: Home, category: 'pages', kind: 'app' },
  { id: 'login', label: 'Login', component: Login, category: 'pages', kind: 'app' },
  // The list/detail skeleton pages — the canonical page-pattern recipes
  // (see DECISIONS.md 2026-07-08). One host = one AppShell; open a row to
  // watch the detail page swap in without the shell remounting.
  {
    id: 'outbound-shipments',
    label: 'Outbound Shipments',
    component: OutboundShipments,
    category: 'pages',
    kind: 'app',
  },
]
