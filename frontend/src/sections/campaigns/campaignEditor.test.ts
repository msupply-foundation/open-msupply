import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { UpsertCampaignResult } from './campaigns.generated';
import type { Campaign } from './campaignRegister';
import {
  campaignInput,
  campaignSaveOutcome,
  canSaveCampaign,
  draftFromCampaign,
  newCampaignDraft,
} from './campaignEditor';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .10 — New activity opens a blank editor with Name, Code and Kind
//   .11 — the confirming action stays inert while Name is blank/whitespace only
//   .12 — a name and a code saves
//   .14 — a row click opens the editor pre-filled with that activity's values
//   .16 — re-saving an activity unchanged succeeds, keeping its own name
//   .18 — a second activity with an existing name is rejected as a duplicate
//   .19 — a name differing only in letter case is rejected as a duplicate
//   .37 — an activity saves with no code; several can go without one
//   .38 — a second activity with an existing code is rejected as a duplicate
// The editor's rules live in pure functions, so each is pinned at the cheapest
// layer: the draft → input mapping (what the whole-record write actually sends)
// and the mapping of the upsert's two rejection SHAPES onto what the dialog
// shows. The dialog lifecycle itself (stays open, values preserved — `.22`) is
// the shared Dialog contract, exercised in the UI.

const campaign: Campaign = {
  id: 'camp-1',
  name: 'Measles 2026',
  code: 'MSL26',
  kind: 'CAMPAIGN',
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
          code: 'MSL26',
          kind: 'CAMPAIGN',
        },
      },
    },
  },
});

// The upsert's error variants, taken FROM the generated result rather than
// restated: codegen narrows `__typename` to the union the schema allows, so a
// variant that is renamed or retired server-side fails this file rather than
// letting a test go on asserting a shape the server can no longer return.
type UpsertCampaignErrorNode = Extract<
  UpsertCampaignResult['centralServer']['campaign']['upsertCampaign'],
  { __typename: 'UpsertCampaignError' }
>['error'];

const errorResult = (
  error: UpsertCampaignErrorNode
): GraphqlResult<UpsertCampaignResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        upsertCampaign: { __typename: 'UpsertCampaignError', error },
      },
    },
  },
});

describe('OMS-REG-MNG-04.10 — New activity opens a blank editor', () => {
  it('starts with an empty name and code, carrying the client-supplied id', () => {
    expect(newCampaignDraft('generated-id')).toEqual({
      id: 'generated-id',
      name: '',
      code: '',
      kind: 'CAMPAIGN',
    });
  });
});

describe('OMS-REG-MNG-04.14 — an edit opens the activity pre-filled', () => {
  it('seeds the draft with that activity’s id, name, code and kind', () => {
    expect(draftFromCampaign(campaign)).toEqual({
      id: 'camp-1',
      name: 'Measles 2026',
      code: 'MSL26',
      kind: 'CAMPAIGN',
    });
  });
});

describe('OMS-REG-MNG-04.33 — the kind is chosen in the editor', () => {
  it('opens a new activity on Campaign, the kind the server also defaults to', () => {
    expect(newCampaignDraft('generated-id').kind).toBe('CAMPAIGN');
  });

  it('opens an edit on the activity’s own kind', () => {
    expect(draftFromCampaign({ ...campaign, kind: 'ROUTINE' }).kind).toBe(
      'ROUTINE'
    );
  });

  // The kind travels on EVERY save: the editor asked for it, so the answer is
  // part of the record being written. The server would keep the stored kind if
  // it were left out, which is the backstop, not the reason.
  it('sends the kind on every save, and a draft without one as CAMPAIGN', () => {
    expect(
      campaignInput({ ...draftFromCampaign(campaign), kind: 'ROUTINE' }).kind
    ).toBe('ROUTINE');
    expect(campaignInput({ id: 'id', name: 'X', code: 'X' }).kind).toBe(
      'CAMPAIGN'
    );
  });
});

describe('OMS-REG-MNG-04.11 — the confirm stays inert while Name is blank', () => {
  it('refuses an empty name', () => {
    expect(canSaveCampaign({ id: 'id', name: '', code: 'POL' })).toBe(false);
  });

  it('refuses a whitespace-only name', () => {
    expect(canSaveCampaign({ id: 'id', name: '   ', code: 'POL' })).toBe(false);
  });

  it('allows a name with content', () => {
    expect(canSaveCampaign({ id: 'id', name: 'Polio', code: 'POL' })).toBe(
      true
    );
  });

  it('allows a name whose content is surrounded by whitespace', () => {
    expect(canSaveCampaign({ id: 'id', name: '  Polio  ', code: 'POL' })).toBe(
      true
    );
  });
});

describe('OMS-REG-MNG-04.37 — the code is optional', () => {
  it('allows a name with no code', () => {
    expect(canSaveCampaign({ id: 'id', name: 'Polio', code: '' })).toBe(true);
  });

  it('sends a blank code as blank, so clearing the field clears the code', () => {
    // Omitting the code would leave the stored one alone; the editor owns the
    // field, so a blank one is the user's answer and travels as such.
    expect(
      campaignInput({ ...draftFromCampaign(campaign), code: '  ' }).code
    ).toBe('');
    expect(campaignInput({ id: 'id', name: 'Polio' }).code).toBe('');
  });
});

describe('OMS-REG-MNG-04.12 — a name and a code saves', () => {
  it('sends the name, code and kind', () => {
    expect(campaignInput({ id: 'id', name: 'Polio', code: 'POL' })).toEqual({
      id: 'id',
      name: 'Polio',
      code: 'POL',
      kind: 'CAMPAIGN',
    });
  });

  it('trims the name it sends — the stored name is never trimmed server-side', () => {
    // The uniqueness check compares against a TRIMMED incoming name while the
    // write persists the name verbatim, so an untrimmed name would sit in the
    // register as a collision-proof duplicate of its trimmed twin.
    expect(
      campaignInput({ id: 'id', name: '  Probe Spaced  ', code: 'P' }).name
    ).toBe('Probe Spaced');
  });

  it('trims the code it sends', () => {
    expect(
      campaignInput({ id: 'id', name: 'Polio', code: '  POL ' }).code
    ).toBe('POL');
  });
});

describe('OMS-REG-MNG-04.16 — re-saving an activity unchanged succeeds', () => {
  it('sends the activity’s own id, name and code back, so uniqueness excludes itself', () => {
    const input = campaignInput(draftFromCampaign(campaign));
    expect(input.id).toBe(campaign.id);
    expect(input.name).toBe(campaign.name);
    expect(input.code).toBe(campaign.code);
  });

  it('reads a CampaignNode response as saved', () => {
    expect(campaignSaveOutcome(successResult('Measles 2026'))).toEqual({
      kind: 'saved',
    });
  });
});

describe('OMS-REG-MNG-04.18 / .19 — a duplicate name is rejected', () => {
  it('maps a name UniqueValueViolation to the name-specific rejection', () => {
    // The server compares names case-INSENSITIVELY, so an exact duplicate and
    // one differing only in letter case arrive as the same typed member — the
    // client keys both to the Name field with one message.
    expect(
      campaignSaveOutcome(
        errorResult({
          __typename: 'UniqueValueViolation',
          description: 'Field needs to be unique',
          field: 'name',
        })
      )
    ).toEqual({ kind: 'duplicate-name' });
  });
});

describe('OMS-REG-MNG-04.38 — a duplicate code is rejected', () => {
  it('maps a code UniqueValueViolation to the code-specific rejection', () => {
    // Name and code collisions arrive as the SAME member; only its field tells
    // them apart, so reading the typename alone would blame the name.
    expect(
      campaignSaveOutcome(
        errorResult({
          __typename: 'UniqueValueViolation',
          description: 'Field needs to be unique',
          field: 'code',
        })
      )
    ).toEqual({ kind: 'duplicate-code' });
  });
});

describe('OMS-REG-MNG-04 — other save outcomes', () => {
  it('maps an UNTYPED Bad user input to the generic save message', () => {
    // The rejection has no member on UpsertCampaignErrorInterface: it arrives
    // as a top-level Bad user input whose extensions.details is the token,
    // with a null payload. A client inspecting only the typed union would see
    // nothing.
    expect(
      campaignSaveOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'CampaignDoesNotExist' },
          },
        ],
      })
    ).toEqual({ kind: 'rejected', serverError: 'CampaignDoesNotExist' });
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

  it('appends a typed non-uniqueness error’s own description', () => {
    expect(
      campaignSaveOutcome(
        errorResult({
          __typename: 'DatabaseError',
          description: 'Database error',
        })
      )
    ).toEqual({ kind: 'rejected', serverError: 'Database error' });
  });

  it('reads a transport failure as failed — the global modal owns it', () => {
    expect(campaignSaveOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});
