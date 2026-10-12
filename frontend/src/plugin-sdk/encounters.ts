/*
 * The encounter data functions the SDK offers form plugins (kdd/custom-forms/
 * specs.md § Opening an older document; implementation-plan K4; remaining
 * work item 21): reads of a patient's other encounters, so a form can show or
 * start from what an earlier visit recorded (the old client's
 * `displayPrevious` and `defaultToPrevious`). Each document is run through
 * its type's migrations before it is returned, so plugin code only ever sees
 * the current type. They act in the entered store, like every SDK call.
 */
import { createMemo, createResource } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import { applyMigrations } from '../domain/documentForm/migration';
import { documentFormVersioning } from '../plugins/documentFormSlot';
import { currentStoreId } from '../store/storeContext';
import type { PluginQuery } from './bridge';
import type { Encounter, EncounterStatus } from './documents';
import {
  SdkPreviousEncounter,
  type SdkPreviousEncounterResult,
} from './encounters.generated';

export interface PreviousEncounterInput {
  /** The patient whose encounters to read. */
  patientId: string;
  /** The encounter type to read: the form's own. */
  documentType: string;
  /**
   * The current encounter's start, as an RFC 3339 instant: the previous
   * encounter is the latest that started before it.
   */
  before: string;
}

/** A previous encounter as the SDK publishes it. Read-only. */
export interface PreviousEncounterView<T extends Encounter> {
  /** When the encounter started, as an RFC 3339 instant. */
  readonly startDatetime: string;
  readonly status: EncounterStatus | undefined;
  /** Its document, migrated to the current version of its type. */
  readonly data: T;
}

type EncounterNode = SdkPreviousEncounterResult['encounters']['nodes'][number];

/*
 * The node's document in the current version of its type: as it is where the
 * type declares no versioning or it is pinned to the current version,
 * migrated from an earlier one, and none where it is pinned to a version this
 * frontend does not know (a site with a newer plugin wrote it), since nothing
 * can say what its values mean here.
 */
export const currentData = (
  node: EncounterNode,
  documentType: string
): unknown => {
  const raw = node.document.data;
  const versioning = documentFormVersioning('encounter.form', documentType);
  if (!versioning) return raw;
  const pinned = versioning.versions.indexOf(node.document.schema?.id ?? '');
  if (pinned < 0) return undefined;
  const current = versioning.versions.length;
  if (pinned + 1 === current) return raw;
  return applyMigrations(raw, pinned + 1, current, versioning.migrations)?.data;
};

/**
 * The patient's previous encounter of a type, read reactively: the latest one
 * of that type, in any status but deleted, that started before `before`.
 * Refetched when the input changes (the visit date edited in the toolbar),
 * paused while it is `undefined`, and never suspending. `data()` is undefined
 * while loading, paused, or when there is no previous encounter; a form tells
 * the last apart with `loading()`.
 *
 * `T` is the plugin's own encounter type, which the SDK cannot check against
 * the stored document; the migrations are what make it true. Must be called
 * under an owner (a component body).
 */
export const usePreviousEncounter = <T extends Encounter>(
  input: () => PreviousEncounterInput | undefined
): PluginQuery<PreviousEncounterView<T>> => {
  type Request = {
    key: string;
    storeId: string;
    input: PreviousEncounterInput;
  };
  const request = createMemo<Request | undefined>(previous => {
    const storeId = currentStoreId();
    const value = input();
    if (!storeId || value === undefined) return undefined;
    const key = JSON.stringify({ storeId, input: value });
    return previous?.key === key ? previous : { key, storeId, input: value };
  });

  const [resource] = createResource(request, async ({ storeId, input }) => {
    const before = Date.parse(input.before);
    if (Number.isNaN(before)) return undefined;
    const result = await graphqlFetch(SdkPreviousEncounter, {
      storeId,
      filter: {
        patientId: { equalTo: input.patientId },
        type: { equalTo: input.documentType },
        // The filter is inclusive; a millisecond earlier leaves out an
        // encounter starting at the same moment, this one among them.
        startDatetime: {
          beforeOrEqualTo: new Date(before - 1).toISOString(),
        },
      },
    });
    if (result.kind !== 'success') return undefined;
    const node = result.data.encounters.nodes[0];
    if (!node) return undefined;
    const data = currentData(node, input.documentType);
    if (data === undefined) return undefined;
    const view: PreviousEncounterView<T> = {
      startDatetime: node.startDatetime,
      status: node.status ?? undefined,
      data: data as T,
    };
    return view;
  });

  return {
    // Gated on `.state` (never a bare `.latest`, which suspends on the first
    // pending read), as useActiveProgramEvents is.
    data: () =>
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined,
    loading: () => resource.loading,
  };
};
