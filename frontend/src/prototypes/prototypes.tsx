import type { Component } from 'solid-js';
import { CatalogueItemsPrototype } from './catalogue-items/CatalogueItemsPrototype';
import { CkHomeNavigatorPrototype } from './ck-home-navigator/CkHomeNavigatorPrototype';

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
    id: 'ck-home-navigator',
    title: 'Cook Islands Home Navigator layout',
    status: 'in-review',
    summary:
      "CK-2.3's layout shell with stand-in tiles, so the hero/block trade and the strip's height reservation can be judged before CK-2.2 builds the real ones.",
    proposes:
      'That the navigator reflows off the space it is actually given rather than off the viewport: the hero and the two-by-two block share a row until they no longer fit and then wrap, the block falls to one column when its tracks cannot hold two, and the strip’s height is reserved before the tile row takes what is left. No media query is involved, because the nav rail is user-toggleable and its state persists — one viewport width yields two different content widths, so a breakpoint would be wrong for one of them.',
    relationToSpec:
      'The GRID is built and specified — plugins/cook_islands/ui-surface.md § S1 Layout, delivered by CK-2.3 in plugins/cook_islands/src/navigator/. Everything INSIDE a tile is scenery: the KPI blocks and the Stock Management strip belong to CK-2.2 and are discarded when it lands. The stand-in strip in particular does NOT solve the sibling-target problem the real one must (§ S3), and the figures are invented.',
    openQuestions: [
      'The hero and block basis values (--ck-hero-basis / --ck-block-basis, 20rem and 30rem) set where the row wraps. They are a first cut and want settling against a real landscape tablet — roughly 1280×715 with app chrome taken off — with the nav rail both docked and collapsed.',
      'The height trade: the strip reserves its natural height first and the tile row takes the remainder. Confirm that is the right priority when the screen is tight, or whether the hero should hold its size and the strip give way instead.',
      'Tile minimum width (--ck-tile-min, 13rem) decides when the two-by-two becomes one column. Worth checking against the longest label in the spec table, "Send stock to another facility".',
      'Whether the real tiles will change these numbers materially: the stand-ins carry one or two figures at --text-xl, which is the current guess at the KPI block’s bulk.',
    ],
    component: CkHomeNavigatorPrototype,
  },
  {
    id: 'catalogue-items',
    title: 'Catalogue items admin',
    status: 'in-review',
    summary:
      'Proposing one catalogue item, or several hundred from a spreadsheet, and approving the change before it reaches any store.',
    proposes:
      'One page per concept, with permissions changing the affordances rather than the location: a store user and a catalogue administrator both go to Catalogue › Items, and a scope strip states whose data it is and how far a change reaches. Central data is never written directly: a change is proposed, then approved. A rejection carries a reason, nobody approves their own request, and an import batch is one decision rather than one per row.',
    relationToSpec:
      'Diverges from spec/items, deliberately. That vertical is specified read-only: S1 "Page actions: none", § Scope "item records are maintained in central data entry outside this app", and OMS-FUN-ITEM-001 ("Create Items in OMS Central") was explicitly not folded in. Nothing here is built in src/sections/items. Adopting it needs MORE than a spec change: the schema exposes no item create/update mutation at all (no insertItem / updateItem / upsertItem, including under centralServer, where variants, bundling, ancillary items and barcodes all have one but the item record does not), so it needs a backend + schema change as well.',
    openQuestions: [
      'Should open mSupply carry legacy mSupply\u2019s Category 1 / 2 / 3 hierarchy? The schema models categories as a FLAT list (ItemCategoryNode is id + name, no parent), so this form offers a multi-select. If the tiers matter for reporting, the schema needs them.',
      'Are these legacy General-tab fields dropped deliberately, or missing from the new schema? Department (customer access restriction), Default shelf location, Price list / online-catalogue inclusion, and the three independent stock-category flags (Normal stock, Critical stock, Essential drug, where this form has a single Active instead).',
      'Non-stock items: legacy pairs the flag with a mandatory Default customer. Open mSupply has NON_STOCK as an item type but no default-customer field. Is that flow still supported?',
      'Cross-reference items (a brand name that redirects to a normal item) have no equivalent in the schema. Retired, or not yet built?',
      'Warnings, barcodes and per-store visibility are all in the schema but not on this form. They are linked records (a warning carries its own priority flag per item), so they belong on the item detail view rather than a create dialog. Confirm that split.',
      'Does a catalogue administrator\u2019s own change need approval too, or only a store user\u2019s request? This prototype routes BOTH through the queue, which is the stricter reading and the one the dialog copy implies.',
      'Nobody can approve their own request here. In a deployment with a single catalogue approver that blocks every change they raise, so it needs either a second approver or an explicit self-approval preference. Which?',
      'Is there a withdraw path? A requester currently cannot cancel their own pending request, only wait for a decision.',
      'Approval has no schema backing either: there is no request or approval entity, so this needs the same backend work as the item mutation itself.',
    ],
    component: CatalogueItemsPrototype,
  },
];
