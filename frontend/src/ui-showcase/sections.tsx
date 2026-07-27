import type { Component } from 'solid-js';
import {
  SlidersIcon,
  CopyIcon,
  CardViewIcon,
  FileIcon,
  type IconProps,
} from '../ui/icons';
import { TypographyShowcase, typographyMetadata } from './TypographyShowcase';
import { IconsShowcase } from './IconsShowcase';
import { ButtonsShowcase, buttonsMetadata } from './ButtonsShowcase';
import { InputsShowcase, inputsMetadata } from './InputsShowcase';
import { SelectorsShowcase, selectorsMetadata } from './SelectorsShowcase';
import { FeedbackShowcase, feedbackMetadata } from './FeedbackShowcase';
import { DialogShowcase, dialogMetadata } from './DialogShowcase';
import { DisplayShowcase, displayMetadata } from './DisplayShowcase';
import {
  DocumentUploadShowcase,
  documentUploadMetadata,
} from './DocumentUploadShowcase';
import { SyncShowcase, syncMetadata } from './SyncShowcase';
import { TableShowcase } from './TableShowcase';
import { DetailTableShowcase } from './DetailTableShowcase';
import { HeaderShowcase, headerMetadata } from './HeaderShowcase';
import { TabBarShowcase, tabBarMetadata } from './TabBarShowcase';
import { AccordionShowcase, accordionMetadata } from './AccordionShowcase';
import {
  ContentFooterShowcase,
  contentFooterMetadata,
} from './ContentFooterShowcase';
import { SidePanelShowcase, sidePanelMetadata } from './SidePanelShowcase';
import { StatisticsShowcase, statisticsMetadata } from './StatisticsShowcase';
import { InsetPanelShowcase, insetPanelMetadata } from './InsetPanelShowcase';
import { CardGridShowcase, cardGridMetadata } from './CardGridShowcase';
import { ChartsShowcase, chartsMetadata } from './ChartsShowcase';
import { PageLayoutShowcase, pageLayoutMetadata } from './PageLayoutShowcase';
import { FormLayoutShowcase, formLayoutMetadata } from './FormLayoutShowcase';
import { TableCardShowcase, tableCardMetadata } from './TableCardShowcase';
import { FormsShowcase } from './FormsShowcase';
import { buildSearchIndex, type PageMetadata } from './metadata';

export type SectionCategory = 'components' | 'layout' | 'pages';

export type SectionDef = {
  id: string;
  label: string;
  component: Component;
  /**
   * The page's Table-of-Contents + search metadata. Present on the standard
   * section pages (Components + Layout); absent on the full-page `fill` demos
   * and the Icons reference. The page renders its own TOC from this; the
   * registry aggregates every section's metadata into `searchIndex` below.
   */
  metadata?: PageMetadata;
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
  { id: 'pages', label: 'Page Examples', icon: FileIcon },
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
    metadata: typographyMetadata,
    category: 'components',
  },
  {
    id: 'buttons',
    label: 'Buttons',
    component: ButtonsShowcase,
    metadata: buttonsMetadata,
    category: 'components',
  },
  {
    id: 'inputs',
    label: 'Inputs',
    component: InputsShowcase,
    metadata: inputsMetadata,
    category: 'components',
  },
  {
    id: 'selectors',
    label: 'Selectors',
    component: SelectorsShowcase,
    metadata: selectorsMetadata,
    category: 'components',
  },
  {
    id: 'tab-bar',
    label: 'Tab bar',
    component: TabBarShowcase,
    metadata: tabBarMetadata,
    category: 'components',
  },
  {
    id: 'accordion',
    label: 'Accordion',
    component: AccordionShowcase,
    metadata: accordionMetadata,
    category: 'components',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    component: FeedbackShowcase,
    metadata: feedbackMetadata,
    category: 'components',
  },
  {
    id: 'statistics',
    label: 'Statistics',
    component: StatisticsShowcase,
    metadata: statisticsMetadata,
    category: 'components',
  },
  {
    id: 'charts',
    label: 'Charts',
    component: ChartsShowcase,
    metadata: chartsMetadata,
    category: 'components',
  },
  {
    id: 'display',
    label: 'Display',
    component: DisplayShowcase,
    metadata: displayMetadata,
    category: 'components',
  },
  {
    id: 'document-upload',
    label: 'Document upload',
    component: DocumentUploadShowcase,
    metadata: documentUploadMetadata,
    category: 'components',
  },
  {
    id: 'sync',
    label: 'Sync',
    component: SyncShowcase,
    metadata: syncMetadata,
    category: 'components',
  },
  {
    id: 'header',
    label: 'Header',
    component: HeaderShowcase,
    metadata: headerMetadata,
    category: 'layout',
  },
  {
    id: 'content-footer',
    label: 'Content footer',
    component: ContentFooterShowcase,
    metadata: contentFooterMetadata,
    category: 'layout',
  },
  {
    id: 'side-panel',
    label: 'Side panel',
    component: SidePanelShowcase,
    metadata: sidePanelMetadata,
    category: 'layout',
  },
  {
    id: 'inset-panel',
    label: 'Inset panel',
    component: InsetPanelShowcase,
    metadata: insetPanelMetadata,
    category: 'layout',
  },
  {
    id: 'dialog',
    label: 'Dialog / Modal',
    component: DialogShowcase,
    metadata: dialogMetadata,
    category: 'layout',
  },
  {
    id: 'card-grid',
    label: 'Card grid',
    component: CardGridShowcase,
    metadata: cardGridMetadata,
    category: 'layout',
  },
  {
    id: 'page-layout',
    label: 'Page layout',
    component: PageLayoutShowcase,
    metadata: pageLayoutMetadata,
    category: 'layout',
  },
  {
    id: 'form-layout',
    label: 'Form layout',
    component: FormLayoutShowcase,
    metadata: formLayoutMetadata,
    category: 'layout',
  },
  // The card/table model walkthrough — the interactive companion to
  // docs/CARD_TABLE_MODEL.md, bridging into the Pages group it cross-links to
  // (List page / Detail table page are its assembled results).
  {
    id: 'table-card',
    label: 'Table & Card',
    component: TableCardShowcase,
    metadata: tableCardMetadata,
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
    id: 'detail-table',
    label: 'Detail table page',
    component: DetailTableShowcase,
    category: 'pages',
    fill: true,
  },
  {
    id: 'forms',
    label: 'Detail form page',
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

/*
 * The flattened search index — every standard page's metadata (the full-page
 * `fill` demos and the Icons reference carry none) folded into one searchable
 * SearchEntry[]: a page entry plus one per item, each with a precomputed
 * haystack. Built once here from the registry, so a new section flows in
 * automatically. Unused until the showcase Search lands — the per-page TOCs
 * already read the same metadata directly (see SectionTOC). The array is the
 * shape a search input would scan; see metadata.ts for how to query it.
 */
export const searchIndex = buildSearchIndex(
  sections
    .map(section => section.metadata)
    .filter((metadata): metadata is PageMetadata => metadata !== undefined)
);
