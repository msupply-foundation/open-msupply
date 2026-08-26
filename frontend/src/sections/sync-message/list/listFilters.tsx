import { t } from '@/intl';
import {
  FilterSelect,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import type { SyncMessagesVariables } from './syncMessages.generated';
import { MESSAGE_STATUSES, statusLabel } from './syncMessageLabels';

// The filter object exactly as GraphQL expects it (kdd/type-safety: no
// remapping — this is the generated variables' filter shape). It flows straight
// through the FilterBar; there is no parallel value model and no mapper.
export type SyncMessageFilter = NonNullable<SyncMessagesVariables['filter']>;

/*
 * Type-driven, EXHAUSTIVE filter definitions for the sync-message register
 * (spec/sync-message/ui-surface.md S1 § filters, OMS-REG-MNG-05.6): STATUS is
 * the only filter offered. The map is keyed by EVERY key of the generated
 * SyncMessageFilterInput — a key maps to a definition to expose it, or `null`
 * to dismiss it — so when the schema gains a filter, codegen adds the key and
 * this map stops compiling until we decide expose-or-dismiss (the reference
 * vertical's pattern, see stocktakes/listFilters).
 *
 * Built once at module load — a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/solid-reactivity-pitfalls § no
 * remounts). Labels are ACCESSORS read in FilterBar's JSX, so they
 * re-translate on a language switch without rebuilding the array.
 */
const FILTERS: Filter<SyncMessageFilter>[] =
  constructFilters<SyncMessageFilter>({
    // ─ user-facing, in display order ───────────────────────────────────────
    // Single-select over the four statuses, matched by equality. The server
    // maps equalTo, equalAny and notEqualTo on this input; a single-select
    // needs only equalTo. '' clears the choice (→ null, so the chip stays on
    // the bar as the screen's default filter).
    status: {
      label: () => t('label.status'),
      render: props => (
        <FilterSelect
          label={t('label.status')}
          testId={props.testId}
          value={props.filter().status?.equalTo ?? ''}
          // DERIVED from the schema, never hand-listed: MESSAGE_STATUSES
          // comes from the generated wire enum via the exhaustive
          // STATUS_KEYS map, so a status added to the backend and picked up
          // by codegen appears here as soon as it is given a label — and the
          // compiler refuses the build until it is. The labels are the same
          // ones the Status column renders, so filter and column can never
          // disagree about what a status is called.
          options={[
            { value: '', label: t('label.any') },
            ...MESSAGE_STATUSES.map(status => ({
              value: status,
              label: statusLabel(status),
            })),
          ]}
          onChange={value =>
            props.setPartialFilter({
              status: value ? { equalTo: value } : null,
            })
          }
        />
      ),
    },

    // ─ dismissed (not user-facing) ─────────────────────────────────────────
    // Kind has NO filter field on this input at all — the register offers no
    // kind filter for that reason, and offering the schema's `type` is not
    // even possible here (D120; contract ⚠️ wire trap — a filter object
    // carrying one fails the WHOLE query at validation).
    //
    // Created-date range: the input DECLARES createdDatetime but
    // SyncMessageFilterInput::to_domain never maps it, so a range narrows
    // nothing and reports no error. Withheld until the server honours it
    // (D120, contract § backend gaps) — a filter that cannot narrow is not
    // offered at all.
    createdDatetime: null,
    // Sender / destination narrowing works on the wire, but only as exact
    // store identity — which needs a store-picking filter chip, not one of the
    // shared filter kinds (rules § listing). Nothing about it is blocked
    // server-side; they stay available to any caller holding a store id.
    toStoreId: null,
    fromStoreId: null,
    // Identity — programmatic, never a user-facing list filter.
    id: null,
  });

export const filterFields = (): Filter<SyncMessageFilter>[] => FILTERS;
