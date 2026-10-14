/*
 * A form's categories as the old client draws a JSON Forms `Categorization`
 * with `"variant": "tab"`: a row of large tiles, one per category, each with
 * its icon, its label and a count of the fields in it that have an error;
 * pressing a tile opens the category's fields in a dialog. The tiles
 * replicate the old client's look (its `CategorizationTabLayout`), so they
 * live in the plugin SDK rather than the core library until program forms
 * move onto the core library's own layout. The dialog and its fields are the
 * core library's.
 *
 * A dialog's content stays mounted while it is closed, so every category's
 * fields render with the form and keep their state (a prescription's picked
 * batches, its step before the save) whichever dialog is open. They write the
 * draft as they are edited, and the record's own Save saves it. From the form
 * library's chunk.
 */
import { Show, createSignal, type JSX } from 'solid-js';
import { tPlural } from '../../intl';
import { OkButton } from '../../ui/elements/buttons/StandardButtons';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { ChevronRightIcon } from '../../ui/icons';
import { Stack } from '../../ui/layout/Stack/Stack';
import type { Draft, HostDraft } from '../../domain/documentForm/draft';
import type { Path } from '../../domain/documentForm/paths';
import styles from './FormCategories.module.css';

export interface FormCategoriesProps {
  /** The `FormCategory` tiles, in the order they show. */
  children: JSX.Element;
}

/** The row of category tiles, centred and wrapping. */
export const FormCategories = (props: FormCategoriesProps): JSX.Element => (
  <div class={styles.categories}>{props.children}</div>
);

export interface FormCategoryProps<T> {
  /** The draft the category's fields edit, for the tile's error count. */
  draft: Draft<T>;
  /** The tile's label and the dialog's title, already translated. */
  label: string;
  /**
   * The tile's icon, drawn large above the label: a `ProgramIcon`, or any
   * icon sized by font-size.
   */
  icon?: JSX.Element;
  /**
   * The paths the category's fields write. The tile counts the errors on
   * show at, or anywhere under, each of them.
   */
  paths: readonly Path<T>[];
  /** The category's fields, stacked in its dialog. */
  children: JSX.Element;
  /** `data-testid` for the tile (e2e/TESTIDS.md). */
  testId?: string;
}

/**
 * How many of the errors on show (`errorPaths`) fall at, or anywhere under,
 * one of a category's paths.
 */
export const categoryErrorCount = (
  errorPaths: readonly string[],
  paths: readonly string[]
): number =>
  errorPaths.filter(error =>
    paths.some(path => error === path || error.startsWith(`${path}.`))
  ).length;

/** One category: its tile, and the dialog that holds its fields. */
export const FormCategory = <T,>(props: FormCategoryProps<T>): JSX.Element => {
  const [open, setOpen] = createSignal(false);
  const missing = () =>
    categoryErrorCount(
      (props.draft as unknown as HostDraft<T>).visibleErrorPaths(),
      props.paths as readonly string[]
    );
  return (
    <>
      <button
        type="button"
        class={styles.tile}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        data-testid={props.testId}
      >
        <span class={styles.icon}>{props.icon}</span>
        <span class={styles.label}>
          {props.label}
          <ChevronRightIcon class={styles.chevron} />
        </span>
        <Show when={missing() > 0}>
          <span class={styles.missing} aria-hidden="true">
            {missing()}
          </span>
          <span class={styles.srOnly}>
            {tPlural('error.document-category-missing', missing())}
          </span>
        </Show>
      </button>
      <Dialog
        open={open()}
        onClose={() => setOpen(false)}
        title={props.label}
        width="form"
        actions={<OkButton onClick={() => setOpen(false)} />}
        testId={props.testId ? `${props.testId}-dialog` : undefined}
      >
        <Stack>{props.children}</Stack>
      </Dialog>
    </>
  );
};
