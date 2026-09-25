import { describe, expect, it } from 'vitest';
import { newRepackDraft, repackPanelState } from './repackSelection';

// The repack modal's selection state (spec/stock OMS-REG-SMV-08.24, .25,
// issue #794): which repack is current, and therefore which row is marked,
// what the panel shows, and what Export/Print acts on — plus the values a new
// repack starts from (.27, issue #516). The modal itself renders a <dialog>
// and a table, which this harness has no DOM to mount — the decisions are
// tested here, the rendering is verified in the running app.

const repack = (id: string, invoiceId: string) => ({
  id,
  invoice: { id: invoiceId },
});

const newer = repack('repack-b', 'invoice-b');
const older = repack('repack-a', 'invoice-a');
const history = [newer, older];

describe('repackPanelState', () => {
  it('marks the selected repack and shows it, resolving it by invoice', () => {
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-a',
      creating: false,
    });
    expect(state.face).toBe('selected');
    expect(state.selected).toBe(older);
    expect(state.selectedRowIds).toEqual(['repack-a']);
    expect(state.canPrint).toBe(true);
  });

  it('marks exactly one row — selecting another moves the mark', () => {
    const first = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-a',
      creating: false,
    });
    const second = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-b',
      creating: false,
    });
    expect(first.selectedRowIds).toEqual(['repack-a']);
    expect(second.selectedRowIds).toEqual(['repack-b']);
  });

  it('prompts for a selection when a history exists and nothing is selected, and refuses to print', () => {
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: undefined,
      creating: false,
    });
    expect(state.face).toBe('prompt');
    expect(state.selectedRowIds).toEqual([]);
    expect(state.canPrint).toBe(false);
  });

  it('says nothing when there is no history and nothing selected', () => {
    const state = repackPanelState({
      repacks: [],
      selectedInvoiceId: undefined,
      creating: false,
    });
    expect(state.face).toBe('none');
    expect(state.canPrint).toBe(false);
  });

  it('treats a selection the history does not hold as none', () => {
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-elsewhere',
      creating: false,
    });
    expect(state.face).toBe('prompt');
    expect(state.selected).toBeUndefined();
    expect(state.selectedRowIds).toEqual([]);
    expect(state.canPrint).toBe(false);
  });

  it('gives the panel to the editor while a new repack is being entered', () => {
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: undefined,
      creating: true,
    });
    expect(state.face).toBe('editor');
    expect(state.selectedRowIds).toEqual([]);
    expect(state.canPrint).toBe(false);
  });

  it('keeps the editor in front even if a selection outlives it', () => {
    // Starting a new repack clears the selection, so this state should not
    // arise — but if it ever did, the editor the user is typing into must not
    // be replaced by a read-only view of some other repack.
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-a',
      creating: true,
    });
    expect(state.face).toBe('editor');
  });
});

describe('newRepackDraft', () => {
  const shelf = { id: 'loc-a', code: 'A1', name: 'Shelf A1' };

  it('starts with every available pack, pack size 1, and the line location', () => {
    expect(
      newRepackDraft({ availableNumberOfPacks: 99, location: shelf })
    ).toEqual({ numberOfPacks: 99, newPackSize: 1, newLocation: shelf });
  });

  it('starts with no location when the line has none', () => {
    expect(
      newRepackDraft({ availableNumberOfPacks: 4, location: null }).newLocation
    ).toBeNull();
    expect(
      newRepackDraft({ availableNumberOfPacks: 4 }).newLocation
    ).toBeNull();
  });

  it('starts at zero packs when none are available', () => {
    expect(
      newRepackDraft({ availableNumberOfPacks: 0, location: shelf })
        .numberOfPacks
    ).toBe(0);
  });
});
