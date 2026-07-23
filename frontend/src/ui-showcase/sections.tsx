import type { Component } from 'solid-js';
import {
  SlidersIcon,
  CopyIcon,
  CardViewIcon,
  FileIcon,
  type IconProps,
} from '../ui/icons';
import { TypographyShowcase } from './TypographyShowcase';
import { IconsShowcase } from './IconsShowcase';
import { ButtonsShowcase } from './ButtonsShowcase';
import { InputsShowcase } from './InputsShowcase';
import { SelectorsShowcase } from './SelectorsShowcase';
import { FeedbackShowcase } from './FeedbackShowcase';
import { DialogShowcase } from './DialogShowcase';
import { DisplayShowcase } from './DisplayShowcase';
import { DocumentUploadShowcase } from './DocumentUploadShowcase';
import { SyncShowcase } from './SyncShowcase';
import { TableShowcase } from './TableShowcase';
import { HeaderShowcase } from './HeaderShowcase';
import { TabBarShowcase } from './TabBarShowcase';
import { AccordionShowcase } from './AccordionShowcase';
import { ContentFooterShowcase } from './ContentFooterShowcase';
import { SidePanelShowcase } from './SidePanelShowcase';
import { StatisticsShowcase } from './StatisticsShowcase';
import { InsetPanelShowcase } from './InsetPanelShowcase';
import { CardGridShowcase } from './CardGridShowcase';
import { ChartsShowcase } from './ChartsShowcase';
import { PageLayoutShowcase } from './PageLayoutShowcase';
import { FormLayoutShowcase } from './FormLayoutShowcase';
import { FormsShowcase } from './FormsShowcase';

export type SectionCategory = 'components' | 'layout' | 'pages';

export type SectionDef = {
  id: string;
  label: string;
  component: Component;
  /** Which menu-bar group the section lists under. */
  category?: SectionCategory;
  /**
   * Render this section as its own top-level menu entry (a leaf link), not
   * inside a category group — for a standalone reference page like Icons.
   * Requires `icon` (top-level entries show one, like the category groups).
   */
  topLevel?: boolean;
  /** Icon for the menu entry — used by top-level sections. */
  icon?: Component<IconProps>;
  /**
   * When true, the section renders a full-height page (its own Page frame)
   * that fills
   *  the panel — the shell drops the section title + panel padding/scroll so
   *  the page owns the whole region (e.g. the Table demo, which is a real list
   *  Page).
   */
  fill?: boolean;
};

/*
 * The menu-bar groups the sections divide into (Carl, 2026-07-08): basic
 * components / layout elements — plus Pages (2026-07-23): the full-page
 * `fill` demos showing the elements assembled into a real page, one entry
 * per page pattern. Element pages explain one thing in demo cards; Pages
 * entries show the assembly in use, cross-linked both ways. The showcase
 * shell derives its MenuBar nav model from this list + the registry below.
 */
export const categories: {
  id: SectionCategory;
  label: string;
  icon: Component<IconProps>;
}[] = [
  { id: 'components', label: 'Components', icon: SlidersIcon },
  { id: 'layout', label: 'Layout Elements', icon: CopyIcon },
  { id: 'pages', label: 'Pages', icon: FileIcon },
];

/*
 * The storybook's section registry. Adding a section = add an entry here;
 * the shell derives the menu (grouped by category) and panels from this list.
 * Section id doubles as the URL hash (#/showcase/buttons), so sections are
 * linkable.
 */
export const sections: SectionDef[] = [
  {
    id: 'typography',
    label: 'Typography',
    component: TypographyShowcase,
    category: 'components',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    component: ButtonsShowcase,
    category: 'components',
  },
  {
    id: 'inputs',
    label: 'Inputs',
    component: InputsShowcase,
    category: 'components',
  },
  {
    id: 'selectors',
    label: 'Selectors',
    component: SelectorsShowcase,
    category: 'components',
  },
  {
    id: 'tab-bar',
    label: 'Tab bar',
    component: TabBarShowcase,
    category: 'components',
  },
  {
    id: 'accordion',
    label: 'Accordion',
    component: AccordionShowcase,
    category: 'components',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    component: FeedbackShowcase,
    category: 'components',
  },
  {
    id: 'statistics',
    label: 'Statistics',
    component: StatisticsShowcase,
    category: 'components',
  },
  {
    id: 'charts',
    label: 'Charts',
    component: ChartsShowcase,
    category: 'components',
  },
  {
    id: 'display',
    label: 'Display',
    component: DisplayShowcase,
    category: 'components',
  },
  {
    id: 'document-upload',
    label: 'Document upload',
    component: DocumentUploadShowcase,
    category: 'components',
  },
  {
    id: 'sync',
    label: 'Sync',
    component: SyncShowcase,
    category: 'components',
  },
  {
    id: 'header',
    label: 'Header',
    component: HeaderShowcase,
    category: 'layout',
  },
  {
    id: 'content-footer',
    label: 'Content footer',
    component: ContentFooterShowcase,
    category: 'layout',
  },
  {
    id: 'side-panel',
    label: 'Side panel',
    component: SidePanelShowcase,
    category: 'layout',
  },
  {
    id: 'inset-panel',
    label: 'Inset panel',
    component: InsetPanelShowcase,
    category: 'layout',
  },
  {
    id: 'dialog',
    label: 'Dialog / Modal',
    component: DialogShowcase,
    category: 'layout',
  },
  {
    id: 'card-grid',
    label: 'Card grid',
    component: CardGridShowcase,
    category: 'layout',
  },
  {
    id: 'page-layout',
    label: 'Page layout',
    component: PageLayoutShowcase,
    category: 'layout',
  },
  {
    id: 'form-layout',
    label: 'Form layout',
    component: FormLayoutShowcase,
    category: 'layout',
  },
  // The Pages group: full-page `fill` demos of the elements assembled into a
  // real page pattern, labelled by the pattern. Ids predate the group and stay
  // as-is — they double as URL hashes, and #/showcase/table / #/showcase/forms
  // links are in circulation.
  {
    id: 'table',
    label: 'List page',
    component: TableShowcase,
    category: 'pages',
    fill: true,
  },
  {
    id: 'forms',
    label: 'Detail form',
    component: FormsShowcase,
    category: 'pages',
    fill: true,
  },
  // A standalone reference page, listed as its own top-level menu entry rather
  // than inside a category group.
  {
    id: 'icons',
    label: 'Icons',
    component: IconsShowcase,
    topLevel: true,
    icon: CardViewIcon,
  },
];
