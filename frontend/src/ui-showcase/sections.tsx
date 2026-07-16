import type { Component } from 'solid-js';
import { SlidersIcon, CopyIcon, type IconProps } from '../ui/icons';
import { TypographyShowcase } from './TypographyShowcase';
import { ButtonsShowcase } from './ButtonsShowcase';
import { InputsShowcase } from './InputsShowcase';
import { SelectorsShowcase } from './SelectorsShowcase';
import { FeedbackShowcase } from './FeedbackShowcase';
import { SyncShowcase } from './SyncShowcase';
import { StoreLoginShowcase } from './StoreLoginShowcase';
import { TableShowcase } from './TableShowcase';
import { HeaderShowcase } from './HeaderShowcase';
import { TabBarShowcase } from './TabBarShowcase';
import { ContentFooterShowcase } from './ContentFooterShowcase';
import { SidePanelShowcase } from './SidePanelShowcase';
import { InsetPanelShowcase } from './InsetPanelShowcase';

export type SectionCategory = 'components' | 'layout';

export type SectionDef = {
  id: string;
  label: string;
  component: Component;
  /** Which menu-bar group the section lists under. */
  category: SectionCategory;
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
 * components / layout elements. The showcase shell derives its MenuBar nav
 * model from this list + the registry below.
 */
export const categories: {
  id: SectionCategory;
  label: string;
  icon: Component<IconProps>;
}[] = [
  { id: 'components', label: 'Components', icon: SlidersIcon },
  { id: 'layout', label: 'Layout Elements', icon: CopyIcon },
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
    id: 'feedback',
    label: 'Feedback',
    component: FeedbackShowcase,
    category: 'components',
  },
  {
    id: 'sync',
    label: 'Sync',
    component: SyncShowcase,
    category: 'components',
  },
  {
    id: 'store-login',
    label: 'Store login',
    component: StoreLoginShowcase,
    category: 'components',
  },
  {
    id: 'table',
    label: 'Table',
    component: TableShowcase,
    category: 'components',
    fill: true,
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
];
