/*
 * Form participation — the dirty/validity/veto/after-save handshake between a
 * plugin contribution and the host form it sits in
 * (spec/plugins/rules.md § form participation,
 * sdk-contract.md § form participation).
 *
 * A host form that carries an editable slot creates ONE coordinator and hands
 * each contribution its own `FormParticipation` view of it. The host then
 * drives the save in the specified order:
 *
 *   runBeforeSave()  →  a throw ABORTS: nothing is persisted, the message shows
 *   host persists
 *   runAfterSave()   →  awaited; the save isn't complete until it resolves
 *
 * Registration is owner-scoped: `onBeforeSave`/`onAfterSave` are called from
 * inside a contribution's component, so the `onCleanup` they install belongs to
 * that component — a contribution that leaves the screen releases its handlers
 * and can no longer affect a save. That is the rule, implemented rather than
 * documented.
 *
 * Handlers run in registration order (insertion-ordered Sets), so two
 * contributions in one form behave the same on every load.
 */
import { createSignal, onCleanup } from 'solid-js';
import type {
  FieldValidity,
  FormParticipation,
  SaveContext,
} from './sdk/types';

type BeforeHandler = () => void | Promise<void>;
type AfterHandler = (context: SaveContext) => void | Promise<void>;

export type BeforeSaveOutcome =
  | { kind: 'ok' }
  /** A contribution threw: the host must not persist, and shows `message`. */
  | { kind: 'vetoed'; message: string };

export type AfterSaveOutcome =
  | { kind: 'ok' }
  /** A post-save handler threw. The host record IS saved; this one isn't. */
  | { kind: 'failed'; message: string };

export interface SaveCoordinator {
  /**
   * A contribution's own view of the coordinator. `key` scopes its validity
   * entries so two contributions can't clobber each other's messages.
   */
  participationFor: (key: string) => FormParticipation;
  /** True when any contribution has declared itself dirty. Reactive. */
  dirty: () => boolean;
  /** The first invalid contribution field's message, if any. Reactive. */
  invalidMessage: () => string | undefined;
  runBeforeSave: () => Promise<BeforeSaveOutcome>;
  runAfterSave: (context: SaveContext) => Promise<AfterSaveOutcome>;
}

/*
 * A thrown non-Error still has to produce something showable: the veto message
 * is user-facing, and swallowing it into a bare "failed" would hide exactly the
 * information the rule exists to surface.
 */
const messageOf = (thrown: unknown): string =>
  thrown instanceof Error ? thrown.message : String(thrown);

export const createSaveCoordinator = (): SaveCoordinator => {
  const before = new Set<BeforeHandler>();
  const after = new Set<AfterHandler>();
  // Keyed by "<contribution key>:<field key>" so a contribution's cleanup can
  // drop only its own entries.
  const [validity, setValidity] = createSignal<
    ReadonlyMap<string, FieldValidity>
  >(new Map());
  const [dirtyKeys, setDirtyKeys] = createSignal<ReadonlySet<string>>(
    new Set()
  );

  const participationFor = (key: string): FormParticipation => {
    // Everything this contribution registered, released together when it goes.
    onCleanup(() => {
      setDirtyKeys(previous => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
      setValidity(previous => {
        const next = new Map(previous);
        for (const entry of next.keys())
          if (entry.startsWith(`${key}:`)) next.delete(entry);
        return next;
      });
    });

    return {
      setDirty: dirty =>
        setDirtyKeys(previous => {
          const next = new Set(previous);
          if (dirty) next.add(key);
          else next.delete(key);
          return next;
        }),

      setValidity: (field, fieldValidity) =>
        setValidity(previous =>
          new Map(previous).set(`${key}:${field}`, fieldValidity)
        ),

      onBeforeSave: handler => {
        before.add(handler);
        onCleanup(() => before.delete(handler));
      },

      onAfterSave: handler => {
        after.add(handler);
        onCleanup(() => after.delete(handler));
      },
    };
  };

  return {
    participationFor,
    dirty: () => dirtyKeys().size > 0,
    invalidMessage: () => {
      for (const entry of validity().values())
        if (!entry.valid) return entry.message ?? '';
      return undefined;
    },

    runBeforeSave: async () => {
      for (const handler of before) {
        try {
          await handler();
        } catch (thrown) {
          return { kind: 'vetoed', message: messageOf(thrown) };
        }
      }
      return { kind: 'ok' };
    },

    runAfterSave: async context => {
      for (const handler of after) {
        try {
          await handler(context);
        } catch (thrown) {
          return { kind: 'failed', message: messageOf(thrown) };
        }
      }
      return { kind: 'ok' };
    },
  };
};
