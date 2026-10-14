import { t } from '@/intl';
import { ASSET_STATUSES, statusLabelKey } from '@/domain/asset';
import type {
  AssetLogReasonsResult,
  InsertAssetLogReasonVariables,
} from './logReasons.generated';

// The log reasons' pure rules (spec/asset-catalogue › rules § log reasons,
// S3/S4): the six statuses and their names, the editor's draft and its one
// check, and the insert a draft becomes.

export type LogReasonRow =
  AssetLogReasonsResult['assetLogReasons']['nodes'][number];
export type AssetLogStatus = LogReasonRow['assetLogStatus'];

/** The six statuses, in the order every surface lists them — the Asset
 *  domain module's, shared with the equipment register. */
export const STATUSES: readonly AssetLogStatus[] = ASSET_STATUSES;

export const statusLabel = (status: AssetLogStatus): string =>
  t(statusLabelKey(status));

export const statusOptions = () =>
  STATUSES.map(value => ({ value, label: statusLabel(value) }));

/** The create editor's draft: status defaults to Functioning, comments
 *  required to off. */
export interface ReasonDraft {
  reason: string;
  status: AssetLogStatus;
  commentsRequired: boolean;
}

export const emptyDraft = (): ReasonDraft => ({
  reason: '',
  status: 'FUNCTIONING',
  commentsRequired: false,
});

/** The editor's one check: a reason that is blank or only spaces is missing.
 *  The server accepts either; only the editor refuses them. */
export const isReasonMissing = (draft: ReasonDraft): boolean =>
  draft.reason.trim() === '';

/** The insert a draft becomes. The text is sent as typed (rules § log
 *  reasons). */
export const toReasonInput = (
  draft: ReasonDraft,
  id: string
): InsertAssetLogReasonVariables['input'] => ({
  id,
  assetLogStatus: draft.status,
  reason: draft.reason,
  commentsRequired: draft.commentsRequired,
});
