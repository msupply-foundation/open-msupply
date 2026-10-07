import { describe, expect, it } from 'vitest';
import {
  createRoot,
  createSignal,
  For,
  onCleanup,
  onMount,
  type Accessor,
  type JSX,
} from 'solid-js';
import { createItemVariantDraft } from './itemVariantDraft';
import type { DraftItemVariant, DraftPackagingRow } from './itemVariantEdit';

/*
 * #593: typing into the packaging grid's Name / Pack size / Volume per unit
 * lost focus on the first keystroke — the row remounted under <For> because
 * each write replaced the row object. The editor's grid renders real inputs,
 * so this pins the MECHANISM the way PluginSlotOutlet.test.tsx does: a <For>
 * over the draft's rows whose cells count their mounts, with field writes
 * standing in for keystrokes. A remount shows as a second mount (and a
 * cleanup) — in the real grid that is the focused input being destroyed.
 * Runs in the solid project (node, no DOM): nothing here renders an element.
 */

const seed = (): DraftItemVariant => ({
  name: '',
  locationTypeId: '',
  manufacturerId: '',
  vvmType: '',
  packaging: [
    {
      id: 'p1',
      name: 'Primary',
      packagingLevel: 1,
      packSize: undefined,
      volumePerUnit: undefined,
    },
    {
      id: 'p2',
      name: 'Secondary',
      packagingLevel: 2,
      packSize: undefined,
      volumePerUnit: undefined,
    },
    {
      id: 'p3',
      name: 'Tertiary',
      packagingLevel: 3,
      packSize: undefined,
      volumePerUnit: undefined,
    },
  ],
});

// A grid over `rows`: one "cell" per row, reading the three editable fields.
// `For`'s result is a memo of the cells; resolving it is the render.
const mountGrid = (rows: Accessor<DraftPackagingRow[]>) => {
  const counts = { mounts: 0, cleanups: 0 };
  let render!: () => string[];
  const dispose = createRoot(disposeRoot => {
    const grid = (
      <For each={rows()}>
        {row => {
          onMount(() => counts.mounts++);
          onCleanup(() => counts.cleanups++);
          // The cell is an accessor, not an element (no DOM here) — the
          // resolver below reads it the way an insert would.
          const cell = () =>
            `${row.name}|${row.packSize ?? ''}|${row.volumePerUnit ?? ''}`;
          return cell as unknown as JSX.Element;
        }}
      </For>
    ) as unknown as () => (() => string)[];
    render = () => grid().map(cell => cell());
    render();
    return disposeRoot;
  });
  return { counts, render, dispose };
};

describe('createItemVariantDraft', () => {
  it('keeps a packaging row mounted while its fields are typed into (#593)', () => {
    const { form, setPackaging } = createItemVariantDraft(seed());
    const grid = mountGrid(() => form.packaging);
    expect(grid.counts).toEqual({ mounts: 3, cleanups: 0 });

    // Several keystrokes into Pack size, then Name and Volume — each a
    // field write, as NumberField/TextField commit them.
    setPackaging('p1', { packSize: 1 });
    setPackaging('p1', { packSize: 12 });
    setPackaging('p1', { packSize: 123 });
    setPackaging('p1', { name: 'Box' });
    setPackaging('p1', { volumePerUnit: 4.5 });

    expect(grid.render()[0]).toBe('Box|123|4.5');
    expect(grid.render()[1]).toBe('Secondary||');
    // The value accumulated in the SAME row: no row was torn down or rebuilt.
    expect(grid.counts).toEqual({ mounts: 3, cleanups: 0 });

    // Clearing a field (NumberField commits undefined) is a leaf write too.
    setPackaging('p1', { packSize: undefined });
    expect(grid.render()[0]).toBe('Box||4.5');
    expect(grid.counts).toEqual({ mounts: 3, cleanups: 0 });
    grid.dispose();
  });

  it('writes the scalar fields in place as well', () => {
    const { form, setForm } = createItemVariantDraft(seed());
    setForm('name', 'Vial');
    setForm('locationTypeId', 'lt1');
    expect(form.name).toBe('Vial');
    expect(form.locationTypeId).toBe('lt1');
    expect(form.packaging[0]?.id).toBe('p1');
  });

  // Control: the shape the editor had — a signal whose setter replaces the
  // row object — DOES remount the row, so the counts above are load-bearing.
  it('control: replacing the row object under <For> remounts it', () => {
    const [rows, setRows] = createSignal(seed().packaging);
    // eslint-disable-next-line solid/reactivity -- handed over as an accessor; mountGrid reads it inside <For>'s tracked `each`
    const grid = mountGrid(rows);
    expect(grid.counts).toEqual({ mounts: 3, cleanups: 0 });
    setRows(current =>
      current.map(row => (row.id === 'p1' ? { ...row, packSize: 1 } : row))
    );
    grid.render();
    expect(grid.counts).toEqual({ mounts: 4, cleanups: 1 });
    grid.dispose();
  });
});
