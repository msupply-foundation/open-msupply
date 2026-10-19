/*
 * The BULK program option set (spec/inbound-shipments ui-surface S3 →
 * line-selection actions): one pick lands on lines of several items, so the
 * list offered is what those items ALL share.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from '@/api/graphql';
import { fetchSharedItemPrograms } from './itemProgramsResource';

vi.mock('@/api/graphql', () => ({
  graphqlFetch: vi.fn(),
  msSinceLastGqlCall: vi.fn(() => 0),
  isForbidden: vi.fn(() => false),
  missingPermissions: vi.fn(() => []),
  reportPermissionDenied: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

// Each item's programs, name-sorted as the query returns them.
const EPI = { id: 'epi', name: 'EPI' };
const COVID = { id: 'covid', name: 'COVID-19' };
const programsByItem: Record<string, { id: string; name: string }[]> = {
  vaccine: [COVID, EPI],
  syringe: [EPI],
  paracetamol: [],
  paracetamol2: [],
};

// Minimal wire payload; the cast is the test's trusted seam (the real shape is
// codegen-validated end to end).
const success = (data: unknown) => ({ kind: 'success', data }) as never;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_document, variables) =>
    success({
      programs: {
        __typename: 'ProgramConnector',
        nodes: programsByItem[(variables as { itemId: string }).itemId] ?? [],
      },
    })
  );
});

describe('fetchSharedItemPrograms', () => {
  it('offers one item`s own programs, as the line editor does', async () => {
    expect(await fetchSharedItemPrograms('store', ['vaccine'])).toEqual({
      programs: [COVID, EPI],
      narrowed: false,
    });
  });

  // The pick is written to EVERY selected line, so a program only some of the
  // items are in would record something untrue of the rest.
  it('keeps only what every selected item is in', async () => {
    expect(
      await fetchSharedItemPrograms('store', ['vaccine', 'syringe'])
    ).toEqual({ programs: [EPI], narrowed: true });
  });

  it('is empty when the selected items share nothing', async () => {
    expect(
      await fetchSharedItemPrograms('store', ['vaccine', 'paracetamol'])
    ).toEqual({ programs: [], narrowed: true });
  });

  // Nothing was dropped, so there is nothing to explain — the field stays
  // quiet rather than blaming the selection for an empty configuration.
  it('is not narrowed when the items agree, even on nothing', async () => {
    expect(
      await fetchSharedItemPrograms('store', ['paracetamol', 'paracetamol2'])
    ).toEqual({ programs: [], narrowed: false });
  });

  it('is empty when nothing is selected, without asking the server', async () => {
    expect(await fetchSharedItemPrograms('store', [])).toEqual({
      programs: [],
      narrowed: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Several batches of one item are several LINES but one item: the request
  // count follows the distinct items, not the size of the selection.
  it('asks once per distinct item', async () => {
    await fetchSharedItemPrograms('store', [
      'vaccine',
      'vaccine',
      'syringe',
      'vaccine',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
