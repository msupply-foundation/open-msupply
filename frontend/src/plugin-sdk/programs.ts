/*
 * The program data functions a form plugin calls (spec/plugins/sdk-contract.md
 * § data access; kdd/custom-forms/specs.md § Generated identifiers, § Program
 * events; implementation-plan K1, K2): a server counter for generated
 * identifiers, and the program events the server derives from documents.
 * Both act in the entered store, like every SDK call, so a plugin never
 * handles a store id.
 */
import { createMemo, createResource } from 'solid-js';
import { graphqlFetch, type GraphqlResult } from '../api/graphql';
import { currentStoreId } from '../store/storeContext';
import type { PluginQuery } from './bridge';
import {
  SdkActiveProgramEvents,
  SdkAllocateProgramNumber,
  type SdkActiveProgramEventsResult,
} from './programs.generated';

/**
 * Allocates the next number of a named counter in the entered store, for an
 * identifier a form generates (`GRY-0042`): the server holds the counter, so
 * two users at one store never draw the same number. Every call spends one.
 *
 * The name is the counter's own, never prefixed: a plugin taking over a
 * deployment names the counter its old forms used, and continues it rather
 * than reissuing numbers already given out. Never throws; a failure is
 * reported by the host's global error handling, so the caller only checks
 * for `success`. Needs the program mutate permission in the store.
 */
export const allocateProgramNumber = async (
  counterName: string
): Promise<GraphqlResult<number>> => {
  const storeId = currentStoreId();
  // A form only renders inside an entered store; without one there is no
  // counter to draw from.
  if (!storeId) return { kind: 'unexpectedError' };
  const result = await graphqlFetch(SdkAllocateProgramNumber, {
    storeId,
    numberName: counterName,
  });
  return result.kind === 'success'
    ? { kind: 'success', data: result.data.allocateProgramNumber.number }
    : result;
};

/**
 * One program event, as the SDK publishes it: a value the server derived from
 * a document by one of its registry entry's event rules (a Field rule copying
 * a field, a Schedule rule setting a status from a date). SDK-owned and
 * read-only; additive-only within a `PLUGIN_API_VERSION` major.
 */
export interface ProgramEventView {
  /** The event's type, as the rule names it (`'currentRegimen'`). */
  readonly type: string;
  /** The event's value (`'FIRST_LINE'`, `'Overdue'`); absent if it has none. */
  readonly data: string | undefined;
  /** When the event became active, as an RFC 3339 instant. */
  readonly activeStartDatetime: string;
  /** When a later event supersedes it, as an RFC 3339 instant. */
  readonly activeEndDatetime: string;
  /** The document type the event targets (a program's enrolment type). */
  readonly documentType: string;
  /** The one document it targets, where the rule targets one. */
  readonly documentName: string | undefined;
}

export interface ActiveProgramEventsInput {
  /** The patient whose events to read. */
  patientId: string;
  /** The document type the events target: a program's enrolment type. */
  documentType: string;
  /** Only events of these types; every type when absent. */
  types?: readonly string[];
}

type EventNode =
  SdkActiveProgramEventsResult['activeProgramEvents']['nodes'][number];

/** The wire node as the SDK's view: absent values as `undefined`. */
export const toProgramEventView = (node: EventNode): ProgramEventView => ({
  type: node.type,
  data: node.data ?? undefined,
  activeStartDatetime: node.activeStartDatetime,
  activeEndDatetime: node.activeEndDatetime,
  documentType: node.documentType,
  documentName: node.documentName ?? undefined,
});

/**
 * The program events active now for a patient and a target document type,
 * read reactively: refetched when the input changes, paused while it is
 * `undefined`, and never suspending, so a form in a modal over an open
 * screen can read them without remounting the screen
 * (kdd/solid-reactivity-pitfalls § no remounts on interaction). The same
 * shape as `usePluginQuery`, and keyed the same way, on the serialised input.
 *
 * The server scopes the result to the programs the user may read in the
 * store. Must be called under an owner (a component body).
 */
export const useActiveProgramEvents = (
  input: () => ActiveProgramEventsInput | undefined
): PluginQuery<readonly ProgramEventView[]> => {
  type Request = {
    key: string;
    storeId: string;
    input: ActiveProgramEventsInput;
  };
  const request = createMemo<Request | undefined>(previous => {
    const storeId = currentStoreId();
    const value = input();
    if (!storeId || value === undefined) return undefined;
    const key = JSON.stringify({ storeId, input: value });
    return previous?.key === key ? previous : { key, storeId, input: value };
  });

  const [resource] = createResource(request, async ({ storeId, input }) => {
    const result = await graphqlFetch(SdkActiveProgramEvents, {
      storeId,
      filter: {
        patientId: { equalTo: input.patientId },
        documentType: { equalTo: input.documentType },
        type: input.types ? { equalAny: [...input.types] } : undefined,
      },
    });
    return result.kind === 'success'
      ? result.data.activeProgramEvents.nodes.map(toProgramEventView)
      : undefined;
  });

  return {
    // Gated on `.state` (never a bare `.latest`, which suspends on the first
    // pending read), as usePluginQuery is.
    data: () =>
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined,
    loading: () => resource.loading,
  };
};
