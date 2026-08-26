import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { UpsertCampaignResult } from './campaigns.generated';
import {
  campaignInput,
  campaignSaveOutcome,
  canSaveCampaign,
  draftFromCampaign,
  newCampaignDraft,
} from './campaignEditor';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .10 — New campaign opens a blank editor with Name, Start date and End date
//   .11 — the confirming action stays inert while Name is blank/whitespace only
//   .12 — a name and no dates saves
//   .13 — both dates save
//   .14 — a row click opens the editor pre-filled with that campaign's values
//   .15 — an edit that changes the name and clears a set date saves as entered
//   .16 — re-saving a campaign unchanged succeeds, keeping its own name
//   .18 — a second campaign with an existing name is rejected as a duplicate
//   .19 — a name differing only in letter case is rejected as a duplicate
//   .20 — a start date later than the end date is rejected as out-of-order
// The editor's rules live in pure functions, so each is pinned at the cheapest
// layer: the draft → input mapping (what the whole-record write actually sends)
// and the mapping of the upsert's two rejection SHAPES onto what the dialog
// shows. The dialog lifecycle itself (stays open, values preserved — `.22`) is
// the shared Dialog contract, exercised in the UI.

const campaign = {
  id: 'camp-1',
  name: 'Measles 2026',
  startDate: '2026-01-01',
  endDate: '2026-03-31',
};

const successResult = (name: string): GraphqlResult<UpsertCampaignResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        upsertCampaign: {
          __typename: 'CampaignNode',
          id: 'camp-1',
          name,
          startDate: null,
          endDate: null,
        },
      },
    },
  },
});

const errorResult = (
  typename: string,
  description: string
): GraphqlResult<UpsertCampaignResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        upsertCampaign: {
          __typename: 'UpsertCampaignError',
          error: { __typename: typename, description },
        },
      },
    },
  },
});

describe('OMS-REG-MNG-04.10 — New campaign opens a blank editor', () => {
  it('starts with an empty name and no dates, carrying the client-supplied id', () => {
    expect(newCampaignDraft('generated-id')).toEqual({
      id: 'generated-id',
      name: '',
    });
  });
});

describe('OMS-REG-MNG-04.14 — an edit opens the campaign pre-filled', () => {
  it('seeds the draft with that campaign’s id, name and both dates', () => {
    expect(draftFromCampaign(campaign)).toEqual({
      id: 'camp-1',
      name: 'Measles 2026',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
  });
});

describe('OMS-REG-MNG-04.11 — the confirm stays inert while Name is blank', () => {
  it('refuses an empty name', () => {
    expect(canSaveCampaign(newCampaignDraft('id'))).toBe(false);
  });

  it('refuses a whitespace-only name', () => {
    expect(canSaveCampaign({ id: 'id', name: '   ' })).toBe(false);
  });

  it('allows a name with content', () => {
    expect(canSaveCampaign({ id: 'id', name: 'Polio' })).toBe(true);
  });

  it('allows a name whose content is surrounded by whitespace', () => {
    expect(canSaveCampaign({ id: 'id', name: '  Polio  ' })).toBe(true);
  });
});

describe('OMS-REG-MNG-04.12 — a name and no dates saves', () => {
  it('sends both dates as undefined when neither is set', () => {
    expect(campaignInput({ id: 'id', name: 'Polio' })).toEqual({
      id: 'id',
      name: 'Polio',
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('trims the name it sends — the stored name is never trimmed server-side', () => {
    // The uniqueness check compares against a TRIMMED incoming name while the
    // write persists the name verbatim, so an untrimmed name would sit in the
    // register as a collision-proof duplicate of its trimmed twin.
    expect(campaignInput({ id: 'id', name: '  Probe Spaced  ' }).name).toBe(
      'Probe Spaced'
    );
  });
});

describe('OMS-REG-MNG-04.13 — both dates save', () => {
  it('sends both dates as plain ISO calendar dates', () => {
    expect(campaignInput(draftFromCampaign(campaign))).toEqual({
      id: 'camp-1',
      name: 'Measles 2026',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
  });

  it('sends an out-of-order period as entered — the ordering rule is the server’s', () => {
    expect(
      campaignInput({
        id: 'id',
        name: 'Backwards',
        startDate: '2026-06-01',
        endDate: '2026-01-01',
      })
    ).toEqual({
      id: 'id',
      name: 'Backwards',
      startDate: '2026-06-01',
      endDate: '2026-01-01',
    });
  });
});

describe('OMS-REG-MNG-04.15 — clearing a set date clears it', () => {
  it('sends a cleared date as undefined, which the whole-record write clears', () => {
    // There are no nullable-update wrappers on this input: every field travels
    // every time, so an omitted date CLEARS the stored one. That is
    // exactly what clearing the field must do — and why a caller treating
    // the mutation as a partial update would silently wipe the period.
    const cleared = campaignInput({
      ...draftFromCampaign(campaign),
      name: 'Measles 2026 (revised)',
      endDate: null,
    });
    expect(cleared).toEqual({
      id: 'camp-1',
      name: 'Measles 2026 (revised)',
      startDate: '2026-01-01',
      endDate: undefined,
    });
  });

  it('treats an empty string from the date field as no date', () => {
    expect(
      campaignInput({ id: 'id', name: 'X', startDate: '' }).startDate
    ).toBe(undefined);
  });
});

describe('OMS-REG-MNG-04.16 — re-saving a campaign unchanged succeeds', () => {
  it('sends the campaign’s own id and name back, so uniqueness excludes itself', () => {
    const input = campaignInput(draftFromCampaign(campaign));
    expect(input.id).toBe(campaign.id);
    expect(input.name).toBe(campaign.name);
  });

  it('reads a CampaignNode response as saved', () => {
    expect(campaignSaveOutcome(successResult('Measles 2026'))).toEqual({
      kind: 'saved',
    });
  });
});

describe('OMS-REG-MNG-04.18 / .19 — a duplicate name is rejected', () => {
  it('maps UniqueValueViolation to the name-specific rejection', () => {
    // The server compares names case-INSENSITIVELY, so an exact duplicate and
    // one differing only in letter case arrive as the same typed member — the
    // client keys both to the Name field with one message.
    expect(
      campaignSaveOutcome(
        errorResult('UniqueValueViolation', 'Unique value violation')
      )
    ).toEqual({ kind: 'duplicate-name' });
  });
});

describe('OMS-REG-MNG-04.20 — out-of-order dates are rejected', () => {
  it('maps the UNTYPED InvalidDates rejection to the generic save message', () => {
    // The rejection has no member on UpsertCampaignErrorInterface: it
    // arrives as a top-level Bad user input whose extensions.details is the
    // token, with a null payload. A client inspecting only the typed union
    // would see nothing.
    expect(
      campaignSaveOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'InvalidDates' },
          },
        ],
      })
    ).toEqual({ kind: 'rejected', serverError: 'InvalidDates' });
  });

  it('falls back to the error message when no details token is carried', () => {
    expect(
      campaignSaveOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [{ message: 'Bad user input' }],
      })
    ).toEqual({ kind: 'rejected', serverError: 'Bad user input' });
  });
});

describe('OMS-REG-MNG-04 — other save outcomes', () => {
  it('appends a typed non-uniqueness error’s own description', () => {
    expect(
      campaignSaveOutcome(errorResult('DatabaseError', 'Database error'))
    ).toEqual({ kind: 'rejected', serverError: 'Database error' });
  });

  it('reads a transport failure as failed — the global modal owns it', () => {
    expect(campaignSaveOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});
