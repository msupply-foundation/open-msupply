import type { GraphqlResult } from '@/api/graphql';
import type { Campaign } from './campaignRegister';
import type {
  UpsertCampaignResult,
  UpsertCampaignVariables,
} from './campaigns.generated';

// The campaign editor's logic (spec/campaigns rules.md § creating and editing a
// campaign, § name and code uniqueness; ui-surface S2/S4). Pure: draft ⇄
// input, the required-field rule, and the mapping from the upsert's two
// rejection SHAPES onto what the dialog shows. No reactivity, so the rules
// are pinned by tests instead of by driving the dialog.

/**
 * The editor's draft IS the generated upsert input (kdd/type-safety: state
 * bound for GraphQL conforms to the generated type). `id` is client-supplied —
 * a fresh uuid on create, the campaign's own on edit — because create and edit
 * are the same whole-record write.
 */
export type CampaignDraft = UpsertCampaignVariables['input'];

/**
 * A blank editor (spec: New activity opens blank — `.10`). Kind opens on
 * Campaign, which is also what the server defaults an omitted kind to.
 */
export const newCampaignDraft = (id: string): CampaignDraft => ({
  id,
  name: '',
  code: '',
  kind: 'CAMPAIGN',
});

/** An edit opens the chosen activity's current kind, name and code (`.14`). */
export const draftFromCampaign = (campaign: Campaign): CampaignDraft => ({
  id: campaign.id,
  name: campaign.name,
  code: campaign.code,
  kind: campaign.kind,
});

/**
 * The confirming action's ONLY precondition: a name that isn't blank or
 * whitespace-only (`.11`). The server accepts a blank name — a captured gap
 * (contract.md wire trap) — so this client stop is the only one, which is why
 * it is the confirm's gate rather than a post-submit rejection. The code is
 * optional (`.37`): only an integration needs one.
 */
export const canSaveCampaign = (draft: CampaignDraft): boolean =>
  draft.name.trim().length > 0;

/**
 * The input a save sends. The name is TRIMMED here and nowhere else: the
 * server stores it verbatim while the uniqueness check compares against a
 * trimmed incoming name, so an untrimmed name can sit in the register as a
 * collision-proof duplicate of its trimmed twin (contract.md wire trap).
 * Trimming on the way out keeps a name saved from this app out of that hole.
 * The code always travels, even blank: the editor owns the field, so a blank
 * one is the user clearing it (the server keeps the stored code only when the
 * field is omitted). The server trims it; it is trimmed here too so the input
 * is the value that lands.
 */
export const campaignInput = (draft: CampaignDraft): CampaignDraft => ({
  id: draft.id,
  name: draft.name.trim(),
  code: draft.code?.trim() ?? '',
  // Kind travels every time too — the editor owns the field and the user has
  // just answered it. Omitting it would be safe (the server keeps the stored
  // kind), but it would also drop the answer.
  kind: draft.kind ?? 'CAMPAIGN',
});

/**
 * What a save came back as (spec ui-surface S4 → the three save surfaces).
 *
 *  - `saved`          — the register refreshes and the dialog closes;
 *                       closure is the confirmation, never a toast
 *                       (D21/D22).
 *  - `duplicate-name` — its own message, keyed to the Name field.
 *  - `duplicate-code` — its own message, keyed to the Code field.
 *  - `rejected`       — the generic save message with the server's own
 *                       description appended. `serverError` is either the
 *                       untyped token or a typed member's
 *                       description; the dialog runs it through
 *                       translateServerError, which passes a plain description
 *                       through and resolves a token.
 *  - `failed`         — a transport/unexpected failure, already surfaced
 *                       by the global modal; the dialog only releases its
 *                       busy state.
 */
export type CampaignSaveOutcome =
  | { kind: 'saved' }
  | { kind: 'duplicate-name' }
  | { kind: 'duplicate-code' }
  | { kind: 'rejected'; serverError: string }
  | { kind: 'failed' };

/**
 * Map an upsert result onto that outcome. The two rejection shapes are
 * deliberately handled together here because only one of them is typed:
 *
 *  - TYPED — an `UpsertCampaignError` member. `UniqueValueViolation` is a
 *    duplicate name or code, told apart by its `field`.
 *  - UNTYPED — a `Bad user input` (e.g. `CampaignDoesNotExist`) has NO member
 *    on `UpsertCampaignErrorInterface`: it arrives as a top-level error with
 *    the token in `extensions.details` and a null payload, so it reaches the
 *    client only as a `graphqlError` (the caller opts into
 *    returnGraphqlErrors for exactly this).
 */
export const campaignSaveOutcome = (
  result: GraphqlResult<UpsertCampaignResult>
): CampaignSaveOutcome => {
  if (result.kind === 'graphqlError') {
    const details = result.errors[0]?.extensions?.details;
    return {
      kind: 'rejected',
      serverError:
        typeof details === 'string' && details.length > 0
          ? details
          : (result.errors[0]?.message ?? 'UnknownError'),
    };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.centralServer.campaign.upsertCampaign;
  if (response.__typename === 'CampaignNode') return { kind: 'saved' };
  if (response.error.__typename === 'UniqueValueViolation')
    return response.error.field === 'code'
      ? { kind: 'duplicate-code' }
      : { kind: 'duplicate-name' };
  return { kind: 'rejected', serverError: response.error.description };
};
