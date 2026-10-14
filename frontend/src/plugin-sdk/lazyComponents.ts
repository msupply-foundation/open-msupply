/*
 * Host-owned LAZY component wrappers (spec/plugins/sdk-contract.md § code
 * splitting & lazy loading): the heavy components a plugin surface needs —
 * the data table, the date picker, the form library — without their weight
 * landing in the SDK's eager entry chunk. The implementation stays a host
 * chunk, shared by the host and every plugin, and loads on first render.
 *
 * A lazy SDK component MUST render inside a `<Suspense>` boundary. A plugin
 * PAGE gets one for free — the host wraps every plugin page route in Suspense
 * (sdk-contract § pages & navigation) — but per kdd/solid-reactivity-pitfalls
 * these must render from the surface's FIRST paint, never first mounted by a
 * later interaction, which would suspend an already-open screen and remount it.
 */
import { lazy, untrack } from 'solid-js';
import type { ConfirmOnLeaveOptions } from '../domain/confirmOnLeave/createConfirmOnLeave';
import type { Component, JSX } from 'solid-js';
import type { DataTableProps } from '../ui/elements/table/DataTable';
import type { DialogProps } from '../ui/elements/feedback/Dialog';
import type { ConfirmDialogProps } from '../ui/elements/feedback/ConfirmDialog';
import type { RecordLinkProps } from './recordLink';
import type {
  FilterBarProps,
  FilterDateRangeProps,
  FilterSelectProps,
  FilterTextInputProps,
} from '../ui/elements/selectors/FilterBar';
import type {
  CheckboxInputProps,
  DateInputProps,
  DateTimeInputProps,
  FieldGroupProps,
  NumberInputProps,
  SelectInputProps,
  TextAreaInputProps,
  TextInputProps,
} from '../domain/documentForm/fields';
import type {
  BooleanPath,
  EnumPath,
  NumberPath,
  TextPath,
} from '../domain/documentForm/paths';
import type { PatientFieldProps } from '../domain/patient/documentFields';
import type { EnrolmentIdFieldProps } from '../domain/documentForm/EnrolmentIdField';
import type { Patient, ProgramEnrolment } from './documents';

const LazyDataTable = lazy(() =>
  import('../ui/elements/table/DataTable').then(m => ({
    // Solid's `lazy` takes a concrete Component, so the generic parameters are
    // pinned here and restored on the export below — the one place the
    // type-erasing cast pair lives.
    default: m.DataTable as Component<DataTableProps<unknown, string, string>>,
  }))
);

/**
 * The host's TanStack-driven data table (sorting, column resizing with
 * double-press auto-fit, pagination, selection, card view, full screen), as a
 * lazy wrapper — a screen's own row set is a DataTable, however few rows it
 * holds (spec/ui-standards/components.md § tables). Rows arrive pre-sorted and
 * pre-paged: the caller owns sort/filter/pagination STATE, the table owns the
 * chrome. See DataTableProps for the contract.
 */
export const DataTable = LazyDataTable as unknown as <
  T,
  K extends string,
  G extends string = never,
>(
  props: DataTableProps<T, K, G>
) => JSX.Element;

/*
 * The filter bar family (spec/ui-standards/components.md § Filter bar): the
 * ONE filter surface — an "Add filter" menu plus typed chips — rendered in a
 * DataTable's `filters` slot, with the styled controls a chip's `render`
 * composes. All four resolve from one host module, so they arrive as one
 * chunk. A chip control first MOUNTS when its chip first shows, so a filter a
 * screen offers should be SEEDED present-as-null in its default filter state —
 * that mounts the control at first paint (inside the page's Suspense) instead
 * of suspending the open screen on the first "Add filter" click.
 */

const LazyFilterBar = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterBar as Component<FilterBarProps<object>>,
  }))
);

/** The host filter bar: "Add filter" menu → typed chips over the caller's own
 * filter object (a key present-as-null is an added-but-empty chip). */
export const FilterBar = LazyFilterBar as unknown as <
  F extends object,
  C extends object = Record<string, never>,
>(
  props: FilterBarProps<F, C>
) => JSX.Element;

/** A chip's search-style text control (debounced; `debounceMs: 0` for
 * client-side sets). */
export const FilterTextInput: Component<FilterTextInputProps> = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterTextInput,
  }))
);

const LazyFilterSelect = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterSelect as Component<FilterSelectProps<string>>,
  }))
);

/** A chip's discrete-choice control — applies immediately, no debounce. */
export const FilterSelect = LazyFilterSelect as unknown as <V extends string>(
  props: FilterSelectProps<V>
) => JSX.Element;

/** A chip's calendar-day range control (pick-only corvu range; `type: 'date'`
 * passes plain ISO days through as inclusive bounds). */
export const FilterDateRange: Component<FilterDateRangeProps> = lazy(() =>
  import('../ui/elements/selectors/FilterBar').then(m => ({
    default: m.FilterDateRange,
  }))
);

/*
 * The form component library (kdd/custom-forms/specs.md § Forms in the UI):
 * the fields a plugin form is written with, each bound to the document draft
 * the host hands the form and a path into the document type. All eight come
 * from one host module, which also carries the AJV validator and the host's
 * default forms, so the first form a user opens fetches them as one chunk,
 * shared by the host and every plugin (vite/lazyChunkGuard.ts keeps it out of
 * the eager entry). A form renders its fields at its own first paint, inside
 * the Suspense its mount point provides.
 */
type FormLibrary = typeof import('../domain/documentForm/formLibrary');

// The library once it has loaded, so that a field mounted after that renders
// at once rather than through `lazy`.
let loadedLibrary: FormLibrary | undefined;
const formLibrary = (): Promise<FormLibrary> =>
  import('../domain/documentForm/formLibrary').then(m => (loadedLibrary = m));

/*
 * A form library component, lazy only until the library has loaded. Solid's
 * `lazy` forgets a loaded component when the last instance of it unmounts, so
 * a field a form shows conditionally (a date that appears once a box is
 * ticked) would suspend on every showing, swapping the whole form for its
 * region's spinner and remounting it (kdd/solid-reactivity-pitfalls). Once
 * the library is in, every new instance renders the real component directly.
 */
const formLibraryComponent = <P extends object>(
  pick: (library: FormLibrary) => Component<P>
): Component<P> => {
  const Lazy = lazy(() => formLibrary().then(m => ({ default: pick(m) })));
  return props => {
    // Rendered as a component renders, outside any caller's tracking.
    const library = loadedLibrary;
    return untrack(() => (library ? pick(library)(props) : Lazy(props)));
  };
};

const LazyTextInput = formLibraryComponent(
  m => m.TextInput as Component<TextInputProps<unknown, never>>
);
/** A single line of free text at a text path. */
export const TextInput = LazyTextInput as unknown as <T, P extends TextPath<T>>(
  props: TextInputProps<T, P>
) => JSX.Element;

const LazyTextAreaInput = formLibraryComponent(
  m => m.TextAreaInput as Component<TextAreaInputProps<unknown, never>>
);
/** Several lines of free text at a text path. */
export const TextAreaInput = LazyTextAreaInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: TextAreaInputProps<T, P>
) => JSX.Element;

const LazyNumberInput = formLibraryComponent(
  m => m.NumberInput as Component<NumberInputProps<unknown, never>>
);
/** A number at a number path. */
export const NumberInput = LazyNumberInput as unknown as <
  T,
  P extends NumberPath<T>,
>(
  props: NumberInputProps<T, P>
) => JSX.Element;

const LazyDateInput = formLibraryComponent(
  m => m.DateInput as Component<DateInputProps<unknown, never>>
);
/** A calendar day, stored as the schema's `format` at the path says. */
export const DateInput = LazyDateInput as unknown as <T, P extends TextPath<T>>(
  props: DateInputProps<T, P>
) => JSX.Element;

const LazyDateTimeInput = formLibraryComponent(
  m => m.DateTimeInput as Component<DateTimeInputProps<unknown, never>>
);
/** A date and time of day, stored as an RFC 3339 instant. */
export const DateTimeInput = LazyDateTimeInput as unknown as <
  T,
  P extends TextPath<T>,
>(
  props: DateTimeInputProps<T, P>
) => JSX.Element;

const LazySelectInput = formLibraryComponent(
  m => m.SelectInput as Component<SelectInputProps<unknown, never>>
);
/** One value of an enum, with a label for every value the type allows. */
export const SelectInput = LazySelectInput as unknown as <
  T,
  P extends EnumPath<T>,
>(
  props: SelectInputProps<T, P>
) => JSX.Element;

const LazyCheckboxInput = formLibraryComponent(
  m => m.CheckboxInput as Component<CheckboxInputProps<unknown, never>>
);
/** A yes/no value at a boolean path. */
export const CheckboxInput = LazyCheckboxInput as unknown as <
  T,
  P extends BooleanPath<T>,
>(
  props: CheckboxInputProps<T, P>
) => JSX.Element;

/** A titled group of fields. */
export const FieldGroup: Component<FieldGroupProps> = formLibraryComponent(
  m => m.FieldGroup
);

/*
 * The host's patient fields (kdd/custom-forms/specs.md § Host-owned surfaces,
 * Patient): one per field of the host's patient form, each bound to a patient
 * document's draft, for a `patient.form` to compose beside its own fields.
 * They carry the host's behaviour for the field (the code generator, age
 * beside date of birth, the store's genders, the next-of-kin search) and
 * write where the base Patient keeps the value, the first contact block for
 * address and phone. From the form library's chunk.
 */

const LazyPatientCodeField = formLibraryComponent(
  m => m.PatientCodeField as Component<PatientFieldProps>
);
/** The patient code, with the host's generator beside it. */
export const PatientCodeField = LazyPatientCodeField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientCode2Field = formLibraryComponent(
  m => m.PatientCode2Field as Component<PatientFieldProps>
);
/** The secondary patient code. */
export const PatientCode2Field = LazyPatientCode2Field as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientFirstNameField = formLibraryComponent(
  m => m.PatientFirstNameField as Component<PatientFieldProps>
);
/** First name, which the base Patient requires. */
export const PatientFirstNameField = LazyPatientFirstNameField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientLastNameField = formLibraryComponent(
  m => m.PatientLastNameField as Component<PatientFieldProps>
);
/** Last name, which the base Patient requires. */
export const PatientLastNameField = LazyPatientLastNameField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientDateOfBirthField = formLibraryComponent(
  m => m.PatientDateOfBirthField as Component<PatientFieldProps>
);
/**
 * Date of birth with age beside it, editable both ways; an age entry marks the
 * date estimated.
 */
export const PatientDateOfBirthField =
  LazyPatientDateOfBirthField as unknown as <T extends Patient>(
    props: PatientFieldProps<T>
  ) => JSX.Element;

const LazyPatientGenderField = formLibraryComponent(
  m => m.PatientGenderField as Component<PatientFieldProps>
);
/** Gender, from the store's configured subset. */
export const PatientGenderField = LazyPatientGenderField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientAddressField = formLibraryComponent(
  m => m.PatientAddressField as Component<PatientFieldProps>
);
/**
 * The address, in the first contact block (the one the patient record shows).
 */
export const PatientAddressField = LazyPatientAddressField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientPhoneField = formLibraryComponent(
  m => m.PatientPhoneField as Component<PatientFieldProps>
);
/**
 * The phone number, in the first contact block (the one the patient record
 * shows).
 */
export const PatientPhoneField = LazyPatientPhoneField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientNextOfKinField = formLibraryComponent(
  m => m.PatientNextOfKinField as Component<PatientFieldProps>
);
/** The next of kin, picked from the store's patients. */
export const PatientNextOfKinField = LazyPatientNextOfKinField as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

const LazyPatientDeceasedFields = formLibraryComponent(
  m => m.PatientDeceasedFields as Component<PatientFieldProps>
);
/** Deceased, with the date of death while it is ticked. */
export const PatientDeceasedFields = LazyPatientDeceasedFields as unknown as <
  T extends Patient,
>(
  props: PatientFieldProps<T>
) => JSX.Element;

/*
 * The host's enrolment ID field, for a `programEnrolment.form` to place where
 * it wants the ID (spec/plugins/sdk-contract.md § the enrolment form). The
 * program passes its ID format as `generate`; the field generates as a new
 * enrolment opens, regenerates on request, and checks for duplicates. From
 * the form library's chunk.
 */
const LazyEnrolmentIdField = formLibraryComponent(
  m => m.EnrolmentIdField as Component<EnrolmentIdFieldProps>
);
/** The enrolment ID, generated from the program's format and checked. */
export const EnrolmentIdField = LazyEnrolmentIdField as unknown as <
  T extends ProgramEnrolment,
>(
  props: EnrolmentIdFieldProps<T>
) => JSX.Element;

/*
 * The modal dialogs (ui-standards § menus, popovers & modals) — the
 * Afghanistan Daily Tally's submit confirmation and its leave prompt
 * (plugins/afghanistan ui-surface § S7, S10). Lazy by kdd/bundling's rule:
 * a dialog is heavy chrome a plugin-free deployment never opens from the
 * SDK. A dialog mounts only while open, so it is never the first render of
 * an already-open screen's Suspense boundary — the one case lazy is unsafe.
 */
export const Dialog: Component<DialogProps> = lazy(() =>
  import('../ui/elements/feedback/Dialog').then(m => ({ default: m.Dialog }))
);

export const ConfirmDialog: Component<ConfirmDialogProps> = lazy(() =>
  import('../ui/elements/feedback/ConfirmDialog').then(m => ({
    default: m.ConfirmDialog,
  }))
);

// Lazy so the router stays out of the eager SDK graph (its module reads
// `window`).
export const RecordLink: Component<RecordLinkProps> = lazy(() =>
  import('./recordLink').then(m => ({ default: m.RecordLink }))
);

/*
 * The dirty-discard guard and its prompt, fused (see the component) — the
 * whole of "leaving with unsaved edits prompts first" as one lazy export.
 *
 * Lazy for two reasons, and the second is not negotiable. It pulls in
 * `Dialog` and its stylesheet, which no plugin should pay for eagerly; and
 * it imports `@solidjs/router`, which runs `saveCurrentDepth()` at module
 * scope and reads `window`, so an eager export would break the SDK barrel's
 * no-module-scope-side-effects rule wherever there is no DOM.
 *
 * The Suspense rule bites harder here than for the table: render it from the
 * surface's FIRST paint with `isDirty` bound, never mount it when the form
 * turns dirty. Mounting a lazy component on an interaction suspends the open
 * screen and remounts it (kdd/solid-reactivity-pitfalls), discarding the edit
 * buffer the guard is there to protect.
 */
export const UnsavedChangesGuard: Component<ConfirmOnLeaveOptions> = lazy(() =>
  import('../domain/confirmOnLeave/UnsavedChangesGuard').then(m => ({
    default: m.UnsavedChangesGuard,
  }))
);
