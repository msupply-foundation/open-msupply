import { describe, expect, it } from 'vitest';
import { repackPanelState } from './repackSelection';

// The repack modal's selection state (spec/stock OMS-REG-SMV-08.24-.26,
// issue #794): which
// repack is current, and therefore which row is marked, what the panel shows,
// and what Export/Print acts on. The modal itself renders a <dialog> and a
// table, which this harness has no DOM to mount — the decision is tested here,
// the rendering is verified in the running app.

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

  it('holds its tongue between a save and the refetch that lists it', () => {
    // The saved repack is selected (its invoice came back from the mutation)
    // but the history in hand is still the pre-save one. Prompting to select a
    // repack here would contradict the save that just happened.
    const state = repackPanelState({
      repacks: history,
      selectedInvoiceId: 'invoice-just-saved',
      creating: false,
    });
    expect(state.face).toBe('none');
    expect(state.selected).toBeUndefined();
    expect(state.selectedRowIds).toEqual([]);
    // Print still acts on the saved repack — the report is fetched by invoice,
    // not from the history row.
    expect(state.canPrint).toBe(true);
  });

  it('resolves that same selection once the refetched history holds it', () => {
    const saved = repack('repack-c', 'invoice-just-saved');
    const state = repackPanelState({
      repacks: [saved, ...history],
      selectedInvoiceId: 'invoice-just-saved',
      creating: false,
    });
    expect(state.face).toBe('selected');
    expect(state.selected).toBe(saved);
    expect(state.selectedRowIds).toEqual(['repack-c']);
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
