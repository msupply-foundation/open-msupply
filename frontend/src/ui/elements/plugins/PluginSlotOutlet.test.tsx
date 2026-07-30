/*
 * eslint-disable solid/reactivity -- this suite drives components by hand
 * (createRoot + resolving the outlet's return value) instead of rendering them,
 * which is the only way to observe mount/cleanup counts without a DOM. Reading
 * props outside a tracked scope is the assertion here, not a mistake.
 */
/* eslint-disable solid/reactivity */
import { describe, expect, it, vi } from 'vitest';
import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
} from 'solid-js';
import {
  PluginSlotOutlet,
  type PluginSlotContribution,
} from './PluginSlotOutlet';

/*
 * The props-carrying outlet (spec/plugins/sdk-contract § the info-panel slot,
 * spec/plugins/acceptance AC-PLUG-N1/N2/E1, `OMS-REG-REPL-16.6`/`.7`/`.8`).
 *
 * The load-bearing assertion is `.7` / AC-PLUG-N2: a slot-props change must
 * reach a live contribution WITHOUT remounting it. That is exactly what the
 * mount/cleanup counters check — a remount would show as a second mount, which
 * in the real modal means a lost counter, a refetched panel, and a detached
 * <dialog> (kdd/solid-reactivity-pitfalls § no remounts on interaction).
 *
 * The outlet renders no DOM of its own and the fixtures below return no
 * elements, so this runs in the node environment against the CLIENT Solid build
 * (vitest.workspace.ts) — reactivity is real, no document is needed.
 */

type Props = { readonly value: string };

// The outlet returns `<For>`'s memo of per-contribution boundaries; each entry
// is itself an accessor (the ErrorBoundary's memo), and reading it is what
// renders that contribution. `render` resolves the whole region, as the DOM
// would.
const mount = (
  contributions: readonly PluginSlotContribution<Props>[],
  slotProps: Accessor<Props>
) => {
  let render!: () => unknown[];
  const dispose = createRoot(disposeRoot => {
    const region = PluginSlotOutlet<Props>({
      contributions,
      slotProps,
      errorFallback: 'Plugin unavailable',
    }) as unknown as () => (() => unknown)[];
    render = () => (region() ?? []).map(entry => entry());
    // The first resolve is the region's initial render.
    render();
    return disposeRoot;
  });
  return { render, dispose };
};

describe('PluginSlotOutlet', () => {
  it('renders nothing at all for an empty contribution set (OMS-REG-REPL-16.6)', () => {
    const { render, dispose } = mount([], () => ({ value: 'a' }));
    // No wrapper, no placeholder, no reserved space — literally no output.
    expect(render()).toEqual([]);
    dispose();
  });

  it('reaches a live contribution with a changed slot prop, and mounts it exactly once (OMS-REG-REPL-16.7, AC-PLUG-N2)', () => {
    const seen: string[] = [];
    let mounts = 0;
    let cleanups = 0;
    const Panel = (props: Props) => {
      onMount(() => mounts++);
      onCleanup(() => cleanups++);
      // Reads the prop reactively, as a contribution's own render does.
      createEffect(() => seen.push(props.value));
      return null;
    };

    const [value, setValue] = createSignal('line-1');
    const { dispose } = mount([{ id: 'p.panel', Component: Panel }], () => ({
      value: value(),
    }));

    expect(mounts).toBe(1);
    expect(seen).toEqual(['line-1']);

    // Save & next: the same contribution, a new DTO.
    setValue('line-2');
    expect(seen).toEqual(['line-1', 'line-2']);
    // The whole point: no teardown, no second mount.
    expect(mounts).toBe(1);
    expect(cleanups).toBe(0);

    dispose();
    expect(cleanups).toBe(1);
  });

  it('keeps ONE props object per contribution, whose reads yield the current DTO', () => {
    // The mechanism behind the test above: props are bound per key to the
    // accessor, so the contribution holds the same object for its whole life
    // and every read of it — even outside a tracking scope — sees the latest
    // value. That is what "props update in place" means.
    let captured: Props | undefined;
    let renders = 0;
    const Panel = (props: Props) => {
      renders++;
      captured = props;
      return null;
    };

    const [value, setValue] = createSignal('line-1');
    const { dispose } = mount([{ id: 'p.panel', Component: Panel }], () => ({
      value: value(),
    }));

    const first = captured;
    expect(captured?.value).toBe('line-1');
    setValue('line-2');
    expect(renders).toBe(1);
    expect(captured).toBe(first);
    expect(first?.value).toBe('line-2');
    // …and the props object presents the DTO's own shape, so a contribution can
    // enumerate or spread it.
    expect(Object.keys(first ?? {})).toEqual(['value']);
    dispose();
  });

  it('contains a throwing contribution to its own place, leaving its sibling live (AC-PLUG-E1, OMS-REG-REPL-16.8)', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen: string[] = [];
    let mounts = 0;
    const Boom = () => {
      throw new Error('deliberate');
    };
    const Good = (props: Props) => {
      onMount(() => mounts++);
      createEffect(() => seen.push(props.value));
      return null;
    };

    const [value, setValue] = createSignal('line-1');
    const { render, dispose } = mount(
      [
        { id: 'p.boom', Component: Boom },
        { id: 'p.good', Component: Good },
      ],
      () => ({ value: value() })
    );

    // The failed contribution shows the translated fallback in its own place;
    // the sibling rendered normally (null here).
    expect(render()).toEqual(['Plugin unavailable', null]);
    expect(errors).toHaveBeenCalled();
    expect(String(errors.mock.calls[0]?.[0])).toContain('p.boom');

    // …and the sibling is still LIVE: it took the prop change and never
    // remounted.
    expect(mounts).toBe(1);
    setValue('line-2');
    expect(seen).toEqual(['line-1', 'line-2']);
    expect(mounts).toBe(1);

    dispose();
    errors.mockRestore();
  });
});
