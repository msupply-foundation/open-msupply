import { describe, expect, it } from 'vitest';
import {
  AUTHORABLE_TYPES,
  EMPTY_FORM,
  buildBody,
  buildInsertInput,
  createOutcome,
  kindTakesArtefacts,
  storeSearchFilter,
  type StoreOption,
  type SyncMessageForm,
} from './syncMessageCreate';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-05.
//   .9  — New message opens the create modal with Type preset to the only
//         authorable kind, Support upload
//   .10 — the destination picker offers every store on the server by code and
//         name, searchable on either, and does not exclude the active store
//   .11 — ticking Logs / Database rewrites the read-only Body preview to state
//         exactly the artefacts ticked; the Body is never author-typed
//   .12 — saving creates the message; From = the active store, Status New, no
//         error message
//   .13 — a message saved with no destination store is accepted
//   .14 — a message can be addressed to the active store itself
//   .15 — a create rejected by the server keeps the modal open, creating
//         nothing
// (rules.md § creating a message; contract.md § creating a message.)

const store = (id: string): StoreOption => ({
  id,
  code: `S-${id}`,
  storeName: `Store ${id}`,
});

const form = (over: Partial<SyncMessageForm> = {}): SyncMessageForm => ({
  ...EMPTY_FORM,
  ...over,
});

describe('OMS-REG-MNG-05.9 — the create form opens on the one authorable kind', () => {
  it('offers exactly one kind — the contract admits no other', () => {
    expect(AUTHORABLE_TYPES).toEqual(['SUPPORT_UPLOAD']);
  });

  it('preselects it, with both artefacts unticked and no destination', () => {
    expect(EMPTY_FORM).toEqual({
      type: 'SUPPORT_UPLOAD',
      logs: false,
      database: false,
    });
  });

  it('takes artefacts, so the two checkboxes are live', () => {
    expect(kindTakesArtefacts('SUPPORT_UPLOAD')).toBe(true);
  });
});

describe('OMS-REG-MNG-05.10 — the destination picker', () => {
  it('searches on code OR name, in one operator', () => {
    expect(storeSearchFilter('tam')).toEqual({ codeOrName: { like: 'tam' } });
  });

  it('sends NO filter for an empty search — never an empty `like`, which the server would treat as a real substring', () => {
    expect(storeSearchFilter('')).toEqual({});
  });

  it('excludes nothing, so the active store is itself offerable', () => {
    // The filter carries no id exclusion of any kind (.14 depends on it).
    expect(storeSearchFilter('tam')).not.toHaveProperty('id');
  });
});

describe('OMS-REG-MNG-05.11 — the body is derived, never typed', () => {
  it('states both artefacts as asked for when neither is ticked', () => {
    expect(buildBody(form())).toBe('{"logs":false,"database":false}');
  });

  it('rewrites as Logs is ticked', () => {
    expect(buildBody(form({ logs: true }))).toBe(
      '{"logs":true,"database":false}'
    );
  });

  it('rewrites as Database is ticked', () => {
    expect(buildBody(form({ database: true }))).toBe(
      '{"logs":false,"database":true}'
    );
  });

  it('states both when both are ticked', () => {
    expect(buildBody(form({ logs: true, database: true }))).toBe(
      '{"logs":true,"database":true}'
    );
  });

  it('is the SAME derivation the insert sends — there is no author-typed body', () => {
    const draft = form({ logs: true });
    expect(buildInsertInput(draft, 'id-1').body).toBe(buildBody(draft));
  });
});

describe('OMS-REG-MNG-05.12 — what the create sends', () => {
  it('sends the client-minted identity, the destination, the derived body and the kind — and nothing else', () => {
    const input = buildInsertInput(form({ toStore: store('b') }), 'id-1');
    expect(input).toEqual({
      id: 'id-1',
      toStoreId: 'b',
      body: '{"logs":false,"database":false}',
      type: 'SUPPORT_UPLOAD',
    });
  });

  it('sends no sender, no created moment, no status and no failure reason — the SERVER fixes all four', () => {
    const input = buildInsertInput(form(), 'id-1');
    expect(input).not.toHaveProperty('fromStoreId');
    expect(input).not.toHaveProperty('createdDatetime');
    expect(input).not.toHaveProperty('status');
    expect(input).not.toHaveProperty('errorMessage');
  });
});

describe('OMS-REG-MNG-05.13 — a message with no destination is valid', () => {
  it('omits toStoreId entirely rather than sending a null', () => {
    const input = buildInsertInput(form(), 'id-1');
    expect(input).not.toHaveProperty('toStoreId');
  });
});

describe('OMS-REG-MNG-05.14 — a message may be addressed to its own sender', () => {
  it('sends the picked store whichever store it is — nothing here excludes the active one', () => {
    const active = store('active');
    expect(buildInsertInput(form({ toStore: active }), 'id-1').toStoreId).toBe(
      'active'
    );
  });
});

describe('OMS-REG-MNG-05.15 — a rejected create keeps the modal open', () => {
  it('reads a success as created', () => {
    expect(
      createOutcome({
        kind: 'success',
        data: { insertSyncMessage: { id: 'id-1' } },
      })
    ).toBe('created');
  });

  it('reads BOTH service rejections as rejected — they arrive as top-level errors, since the response union has no error member', () => {
    expect(
      createOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'SyncMessageAlreadyExists' },
          },
        ],
      })
    ).toBe('rejected');
    expect(
      createOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'ToStoreDoesNotExist' },
          },
        ],
      })
    ).toBe('rejected');
  });

  it('reads a transport failure as rejected too — nothing was created either way', () => {
    expect(createOutcome({ kind: 'unexpectedError' })).toBe('rejected');
  });
});
