/*
 * The document form slots' region: the body of an enrolment or encounter,
 * filled with the plugin form contributed for the document's type or, with
 * none, the host's default form (kdd/custom-forms/specs.md § Forms in the UI).
 * A screen-level region like the dashboard body
 * (sections/dashboard/DashboardBody.tsx): the form IS the body, so a form that
 * throws falls back to the default form rather than to the neutral piece
 * fallback, which would leave the record with no fields at all.
 *
 * The plugin form is mounted once per contribution and fed its props through
 * getters, so a prop change (the record's name arriving with the first save)
 * reaches the live form instead of remounting it and dropping the user's
 * place. Its SDK fields are lazy wrappers, which suspend on their first
 * render, so the form has a Suspense boundary of its own: the enrolment modal
 * opens over the patient screen, whose boundary must never see it.
 *
 * A document on an earlier schema version renders in the plugin's archived
 * form for that version when the form host says so (`archivedVersion`;
 * kdd/custom-forms/specs.md § Opening an older document), and one no form can
 * open renders read-only through the fallback renderer, from the schema it is
 * pinned to (`recorded`; § Forms in the UI, form resolution).
 */
import {
  createComponent,
  createEffect,
  createMemo,
  ErrorBoundary,
  onMount,
  Show,
  Suspense,
  type Component,
  type JSX,
} from 'solid-js';
import type {
  DocumentFormSlotId,
  FormParticipation,
  FormRecordView,
  SlotPropsMap,
} from '../plugin-sdk/types';
import { DocumentAsRecorded } from '../domain/documentForm/DocumentAsRecorded';
import type { RecordedDocument } from '../domain/documentForm/createDocumentForm';
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
  /** The version whose archived form renders, read-only; else the current. */
  archivedVersion?: number;
  /**
   * The document as recorded, while no form can open it (the form host's
   * `recorded`): it renders through the fallback renderer in place of any
   * form.
   */
  recorded?: RecordedDocument;
  /**
   * The form's part in the record's save, from the form host's coordinator
   * (`createDocumentForm`'s `coordinator.participationFor`): passed to a slot
   * whose props carry `form`, the encounter's and the enrolment's. Called once per mounted form,
   * under its owner, so a form that leaves releases its handlers.
   */
  participation?: (key: string) => FormParticipation;
  /**
   * The registry entry's current schema id. A plugin whose `versions` end
   * elsewhere was built against another install of its types, which is
   * named in diagnostics.
   */
  currentSchemaId?: string;
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

  // The component the document renders in: the archived form for its
  // version, or the current form. Held by identity, so Edit (archived to
  // current) remounts the body while nothing else does.
  const rendered = createMemo<
    { id: string; Component: Component<SlotPropsMap[S]> } | undefined
  >(
    () => {
      const o = occupant();
      if (!o) return undefined;
      const version = props.archivedVersion;
      const archived =
        version === undefined ? undefined : o.archived?.[version];
      return archived
        ? { id: o.id, Component: archived }
        : { id: o.id, Component: o.Component };
    },
    undefined,
    {
      equals: (previous, next) =>
        previous?.id === next?.id && previous?.Component === next?.Component,
    }
  );

  createEffect(() => {
    const versions = occupant()?.versions;
    const current = props.currentSchemaId;
    if (!versions || !current || versions.at(-1) === current) return;
    const id = occupant()?.id ?? '';
    recordPluginDiagnostic({
      level: 'warning',
      pluginCode: id.split('.')[0],
      message: `${props.slot}: ${id} lists ${versions.at(-1) ?? 'no version'} as the current schema of "${props.documentType}", but the server's is ${current} — the plugin in the browser and the one installed differ`,
    });
  });

  const pluginOrDefault = (): JSX.Element => (
    <Show when={rendered()} keyed fallback={props.fallback()}>
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
              form: props.participation?.(form.id),
            } as SlotPropsMap[S])}
          </Suspense>
        </ErrorBoundary>
      )}
    </Show>
  );

  return (
    <Show when={props.recorded} fallback={pluginOrDefault()}>
      {recorded => (
        <DocumentAsRecorded schema={recorded().schema} data={recorded().data} />
      )}
    </Show>
  );
};
