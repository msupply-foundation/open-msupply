import type { Component } from 'solid-js'
import { SlidersIcon, CopyIcon, FileIcon, type IconProps } from '../ui/icons'
import { TypographyShowcase } from './TypographyShowcase'
import { ButtonsShowcase } from './ButtonsShowcase'
import { InputsShowcase } from './InputsShowcase'
import { SelectorsShowcase } from './SelectorsShowcase'
import { FeedbackShowcase } from './FeedbackShowcase'
import { HeaderShowcase } from './HeaderShowcase'
import { TabBarShowcase } from './TabBarShowcase'
import { ContentFooterShowcase } from './ContentFooterShowcase'
import { SidePanelShowcase } from './SidePanelShowcase'

export type SectionCategory = 'components' | 'layout'

export type SectionDef = {
  id: string
  label: string
  component: Component
  /** Which menu-bar group the section lists under. */
  category: SectionCategory
}

/*
 * The menu-bar groups the sections divide into (Carl, 2026-07-08): basic
 * components / layout elements. The showcase shell derives its MenuBar nav
 * model from this list + the registry below.
 */
export const categories: { id: SectionCategory; label: string; icon: Component<IconProps> }[] = [
  { id: 'components', label: 'Components', icon: SlidersIcon },
  { id: 'layout', label: 'Layout Elements', icon: CopyIcon },
]

/*
 * The "Full page" menu group. Real pages are real app routes now (see
 * src/App.tsx), so these are plain links OUT of the showcase — picking one
 * writes the top-level hash and the app swaps the showcase for the page,
 * exactly as a build ships it; browser Back returns to the showcase. (This
 * supersedes the showcase-internal `kind: 'app'` full-bleed mode — the app
 * router now provides that takeover for free.)
 */
export const pagesGroup: {
  id: string
  label: string
  icon: Component<IconProps>
  links: { id: string; label: string }[]
} = {
  id: 'pages',
  label: 'Full page',
  icon: FileIcon,
  links: [
    { id: 'home', label: 'Home' },
    { id: 'login', label: 'Login' },
    // The list/detail skeleton pages — the canonical page-pattern recipes
    // (see docs/DECISIONS.md 2026-07-08).
    { id: 'outbound-shipments', label: 'Outbound Shipments' },
  ],
}

const ComingSoon: Component = () => (
  <p>Nothing here yet — components land here as they're built.</p>
)

/*
 * The storybook's section registry. Adding a section = add an entry here;
 * the shell derives the menu (grouped by category) and panels from this list.
 * Section id doubles as the URL hash (#/showcase/buttons), so sections are
 * linkable.
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
]
