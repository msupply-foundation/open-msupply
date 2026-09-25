/*
 * The document form slots' region: the body of an enrolment or encounter,
 * filled with the plugin form contributed for the document's type or, with
 * none, the host's default form (kdd/custom-forms/specs.md § Forms in the UI;
 * implementation-plan H5, H10). A screen-level region like the dashboard body
 * (sections/dashboard/DashboardBody.tsx): the form IS the body, so a form
 * that throws falls back to the default form rather than to the neutral
 * piece fallback, which would leave the record with no fields at all.
 *
 * The plugin form is mounted once per contribution and fed its props through
 * getters, so a prop change (the record's name arriving with the first save)
 * reaches the live form instead of remounting it and dropping the user's
 * place. Its SDK fields are lazy wrappers, which suspend on their first
 * render, so the form has a Suspense boundary of its own: the enrolment modal
 * opens over the patient screen, whose boundary must never see it.
 */
import {
  createComponent,
  createMemo,
  ErrorBoundary,
  onMount,
  Show,
  Suspense,
  type JSX,
} from 'solid-js';
import type {
  DocumentFormSlotId,
  FormRecordView,
  SlotPropsMap,
} from '../plugin-sdk/types';
import { Spinner } from '../ui/elements/feedback/Spinner';
import { createRegionDiagnostics, recordPluginDiagnostic } from './diagnostics';
import { documentFormFor, type DocumentFormOccupant } from './documentFormSlot';

export interface DocumentFormRegionProps<S extends DocumentFormSlotId> {
  slot: S;
  /** The opened document's type, as its registry entry names it. */
  documentType: string;
  draft: SlotPropsMap[S]['draft'];
  record: FormRecordView;
  /**
   * The host's default form for the category, over the same draft: rendered
   * when no plugin form is contributed for the type, and in place of one that
   * throws.
   */
  fallback: () => JSX.Element;
}

/**
 * A plugin form that threw: the default form renders in its place, and the
 * failure is named for whoever is asked about it later. A component, so
 * recording is a mount effect rather than a signal write during render.
 */
const FailedForm = (props: {
  slot: DocumentFormSlotId;
  id: string;
  error: unknown;
  fallback: () => JSX.Element;
}): JSX.Element => {
  onMount(() => {
    console.error(`${props.slot}: ${props.id} failed to render`, props.error);
    recordPluginDiagnostic({
      level: 'warning',
      pluginCode: props.id.split('.')[0],
      message: `${props.slot}: ${props.id} failed to render — the host's default form is shown in its place`,
    });
  });
  return <>{props.fallback()}</>;
};

export const DocumentFormRegion = <S extends DocumentFormSlotId>(
  props: DocumentFormRegionProps<S>
): JSX.Element => {
  const resolution = createMemo(() =>
    documentFormFor(props.slot, props.documentType)
  );

  // Held stable while it is the same contribution: the resolution is rebuilt
  // on every registry or store-context change, and a fresh object through the
  // keyed <Show> would remount a live form (kdd/solid-reactivity-pitfalls).
  const occupant = createMemo<DocumentFormOccupant<S> | undefined>(
    () => resolution().occupant,
    undefined,
    {
      equals: (previous, next) =>
        previous?.id === next?.id && previous?.Component === next?.Component,
    }
  );

  createRegionDiagnostics(
    () => resolution().diagnostics,
    () => props.slot
  );

  return (
    <Show when={occupant()} keyed fallback={props.fallback()}>
      {form => (
        <ErrorBoundary
          fallback={error => (
            <FailedForm
              slot={props.slot}
              id={form.id}
              error={error}
              fallback={props.fallback}
            />
          )}
        >
          <Suspense fallback={<Spinner center />}>
            {createComponent(form.Component, {
              get draft() {
                return props.draft;
              },
              get record() {
                return props.record;
              },
            } as SlotPropsMap[S])}
          </Suspense>
        </ErrorBoundary>
      )}
    </Show>
  );
};
