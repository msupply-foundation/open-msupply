/*
 * The plugin contract's TYPE half (spec/plugins/sdk-contract.md). Kept in its
 * own module so the shapes a plugin is compiled against carry no runtime
 * weight: `import type` from here costs a plugin bundle nothing.
 *
 * Everything here is public API. Slot prop DTOs are SDK-OWNED view types mapped
 * from host data at each slot boundary — never a host feature type, never a
 * GraphQL-generated fragment. That is the whole point: host internals churn
 * freely, installed plugins keep working (kdd/plugin-loading § decision 2).
 * DTOs are additive-only within an API major.
 */
import type { JSX } from 'solid-js';

/**
 * The integer the loader gates on (spec/plugins/rules.md § compatibility
 * gates): a plugin declaring a HIGHER version than this is refused; a lower one
 * with the same major loads, because the surface only grows within a major.
 *
 * Bump on any breaking change to this file or to the SDK's runtime surface.
 */
export const PLUGIN_API_VERSION = 1;

/** What a plugin declares about itself (sdk-contract § manifest). */
export interface PluginManifest {
  /** == package name; lower_snake_case; stable forever. Names the bundle, the
   *  i18n namespace, and every plugin-data row the plugin writes. */
  code: string;
  /** semver; the server's install-time gate reads this. */
  version: string;
  /** The SDK API this plugin was built against. */
  pluginApiVersion: number;
}

// ── Slots ────────────────────────────────────────────────────────────────────

/*
 * The committed slot ids. Deliberately ONE entry: the spec commits a slot id
 * only once its host surface exists (sdk-contract § contributions ⚠️ VERIFY),
 * and the prescription payment window is the surface that has landed. Adding a
 * slot means adding its host region, its DTO, and its `contribute` helper
 * together — three edits, all click-through-traceable.
 */
export const SLOTS = {
  /** The prescription payment window's form region (prescriptions S5). */
  prescriptionPaymentForm: 'prescription.payment-form',
} as const;

export type SlotId = (typeof SLOTS)[keyof typeof SLOTS];

/**
 * The session facts a contribution may gate its visibility on
 * (rules § contributions: "a hidden contribution renders nothing AND incurs
 * none of its data-fetching cost"). Read at render time, so a gate that
 * depends on store preferences re-evaluates when they load.
 */
export interface SlotContext {
  /** The store the user has entered. Empty string only before entry. */
  storeId: string;
  /** True when the user holds the named permission in the entered store. */
  hasPermission: (permission: string) => boolean;
  /** The entered store's preference row, as the host loaded it. */
  storePreferences: Readonly<Record<string, unknown>>;
}

// ── Contributions ────────────────────────────────────────────────────────────

/**
 * The uniform contribution shape every slot takes
 * (sdk-contract § contributions). `P` is the slot's prop DTO.
 */
export interface Contribution<P> {
  /**
   * Unique within (plugin code, slot). Part of the render key and the
   * tie-break.
   */
  id: string;
  /** Tie-break within a slot; lower first. Default 0. */
  order?: number;
  /** Visibility gate. A hidden contribution never renders and never fetches. */
  when?: (context: SlotContext) => boolean;
  /**
   * An ordinary Solid component receiving this slot's prop DTO. Spelled as the
   * function type rather than `Component<P>` so the DTO can be a plain
   * interface: Solid's own `Component` constrains its parameter to
   * `Record<string, any>`, which an interface only satisfies via an index
   * signature nobody wants on a documented DTO.
   */
  Component: (props: P) => JSX.Element;
}

/**
 * A contribution tagged with the slot it targets — what `definePlugin`
 * collects. Built by the per-slot `contribute.*` helpers, never by hand, so the
 * slot id and the prop DTO can never drift apart.
 */
export type SlotContribution = {
  slot: typeof SLOTS.prescriptionPaymentForm;
} & Contribution<PrescriptionPaymentFormProps>;

// ── Form participation ───────────────────────────────────────────────────────

/** A contribution's verdict on one of its own fields. */
export interface FieldValidity {
  valid: boolean;
  /** Shown by the host when invalid; a translated string, never a key. */
  message?: string;
}

/** What an after-save handler learns about the save that just happened. */
export interface SaveContext {
  /** The host record the form saved, by id — the plugin's relatedRecordId. */
  recordId: string;
}

/**
 * The one object passed to every editable slot (sdk-contract § form
 * participation). Save order: every `onBeforeSave` (a throw ABORTS the save and
 * surfaces its message) → the host persists → every `onAfterSave` is awaited
 * before the save is reported complete.
 *
 * Handlers registered here are released automatically when the contribution
 * leaves the screen (they bind to the calling component's Solid owner), so a
 * departed contribution can no longer affect a save.
 */
export interface FormParticipation {
  /** Mark the host form dirty (enables its save affordance). */
  setDirty: (dirty: boolean) => void;
  /** Gate the host's save on one of the contribution's own fields. */
  setValidity: (key: string, validity: FieldValidity) => void;
  /** Veto hook: throw to abort the save; the Error's message is surfaced. */
  onBeforeSave: (handler: () => void | Promise<void>) => void;
  /** Post-persist hook (e.g. write the contribution's own plugin data). */
  onAfterSave: (
    handler: (context: SaveContext) => void | Promise<void>
  ) => void;
}

// ── Slot prop DTOs ───────────────────────────────────────────────────────────

/**
 * The prescription the payment window is settling, as the SDK exposes it.
 * Mapped from the host's prescription at the slot boundary; the money figures
 * are the host's own derivation from invoice pricing and the selected insurance
 * policy, so every contribution sees the same numbers the host shows.
 */
export interface PrescriptionPaymentDto {
  /**
   * The prescription (invoice) id — the natural `relatedRecordId` for a row.
   */
  id: string;
  /** The prescription's human-facing number. */
  invoiceNumber: number;
  /** Total after tax — the whole charge, before any insurance split. */
  total: number;
  /** What the selected insurance policy covers; 0 when none is selected. */
  totalToBePaidByInsurance: number;
  /** What the patient owes: `total` − `totalToBePaidByInsurance`. */
  totalToBePaidByPatient: number;
}

/** Props for the `prescription.payment-form` slot. */
export interface PrescriptionPaymentFormProps {
  prescription: PrescriptionPaymentDto;
  form: FormParticipation;
}

// ── Entry ────────────────────────────────────────────────────────────────────

/** What a plugin bundle default-exports (sdk-contract § entry contract). */
export interface PluginDefinition {
  manifest: PluginManifest;
  contributions?: SlotContribution[];
}
