import type { Component } from 'solid-js';
import { CatalogueItemsPrototype } from './catalogue-items/CatalogueItemsPrototype';

/*
 * The prototype registry.
 *
 * Adding a prototype = add an entry here and create its folder beside this
 * file. The shell derives the menu, the index page and the routes from this
 * list; the id doubles as the URL hash (#/prototypes/catalogue-items), so every
 * prototype is linkable.
 *
 * Why this is separate from src/ui-showcase/: the showcase documents what the
 * component library IS — every entry there is a built, specified component, and
 * a reviewer should be able to trust it as reference. A prototype is the
 * opposite: an unbuilt PROPOSAL, often one that diverges from a vertical's
 * current spec. Mixing the two would make the showcase unciteable. See
 * README.md here.
 */

/**
 * Where a prototype sits in the decision, not how finished it looks. Shown on
 * the index and in the prototype's own header, because "is this the plan or an
 * idea?" is the first thing an internal reviewer needs to know.
 */
export type PrototypeStatus = 'draft' | 'in-review' | 'accepted' | 'superseded';

export const STATUS_LABEL: Record<PrototypeStatus, string> = {
  draft: 'Draft',
  'in-review': 'In review',
  accepted: 'Accepted',
  superseded: 'Superseded',
};

/*
 * Status → StatusChip colour. StatusChip takes a colour VALUE, always a token
 * (colour literals live only in tokens.css). The chip's label carries the
 * meaning; colour only reinforces it.
 */
export const STATUS_COLOUR: Record<PrototypeStatus, string> = {
  draft: 'var(--gray-main)',
  'in-review': 'var(--warning-main)',
  accepted: 'var(--success-main)',
  superseded: 'var(--text-disabled)',
};

export interface PrototypeDef {
  /** URL hash segment and menu id. */
  id: string;
  /** Menu + index + breadcrumb label. */
  title: string;
  status: PrototypeStatus;
  /** One line for the index card — what the prototype shows. */
  summary: string;
  /**
   * What it ARGUES, in the reviewer's terms. The index shows it, so someone
   * can decide whether to open the thing.
   */
  proposes: string;
  /**
   * Where the proposal sits against what is already specified or built. This is
   * the field that keeps a prototype honest: if it diverges from a vertical's
   * spec, say so here rather than letting a reviewer assume it is the plan.
   */
  relationToSpec?: string;
  /**
   * Decisions the prototype cannot make for itself — the things a reviewer is
   * being asked to rule on. Shown on the card, so the open questions travel
   * with the proposal instead of living in someone's notes.
   */
  openQuestions?: string[];
  /**
   * The prototype itself. It composes its OWN <Page> (and header), exactly like
   * a real vertical's screen, and the shell drops it straight into the content
   * slot — every prototype is a full page, so there is no non-fill variant.
   */
  component: Component;
}

export const prototypes: PrototypeDef[] = [
  {
    id: 'catalogue-items',
    title: 'Catalogue items admin',
    status: 'in-review',
    summary:
      'Creating one catalogue item, and importing several hundred from a spreadsheet.',
    proposes:
      'One page per concept, with permissions changing the affordances rather than the location: a store user and a catalogue administrator both go to Catalogue › Items, and a scope strip states whose data it is and how far a change reaches.',
    relationToSpec:
      'Diverges from spec/items, deliberately. That vertical is specified read-only — S1 "Page actions: none", § Scope "item records are maintained in central data entry outside this app", and OMS-FUN-ITEM-001 ("Create Items in OMS Central") was explicitly not folded in. Nothing here is built in src/sections/items. Adopting it needs MORE than a spec change: the schema exposes no item create/update mutation at all (no insertItem / updateItem / upsertItem, including under centralServer — variants, bundling, ancillary items and barcodes all have one; the item record does not), so it needs a backend + schema change as well.',
    openQuestions: [
      'Should open mSupply carry legacy mSupply\u2019s Category 1 / 2 / 3 hierarchy? The schema models categories as a FLAT list (ItemCategoryNode is id + name, no parent), so this form offers a multi-select. If the tiers matter for reporting, the schema needs them.',
      'Are these legacy General-tab fields dropped deliberately, or missing from the new schema? Department (customer access restriction), Default shelf location, Price list / online-catalogue inclusion, and the three independent stock-category flags (Normal stock, Critical stock, Essential drug \u2014 this form has a single Active instead).',
      'Non-stock items: legacy pairs the flag with a mandatory Default customer. Open mSupply has NON_STOCK as an item type but no default-customer field \u2014 is that flow still supported?',
      'Cross-reference items (a brand name that redirects to a normal item) have no equivalent in the schema. Retired, or not yet built?',
      'Warnings, barcodes and per-store visibility are all in the schema but not on this form \u2014 they are linked records (a warning carries its own priority flag per item), so they belong on the item detail view rather than a create dialog. Confirm that split.',
    ],
    component: CatalogueItemsPrototype,
  },
];
