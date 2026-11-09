/*
 * The page-contribution slots (sdk-contract § the page contribution ›
 * rendering): the three the SDK publishes, and the factory behind them. All
 * three are REACTIVE and all three hand the region back on dispose — but only
 * while they still hold it, which is what keeps a route transition that mounts
 * the next page first from blanking its region.
 */
import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import {
  createPageSlot,
  pageActions,
  pageFooter,
  pageTrail,
} from './pageSlots';
import {
  usePageActions,
  usePageFooter,
  usePageTrail,
} from '../plugin-sdk/navigation';

describe('createPageSlot', () => {
  it('publishes as the page is set up, not a pass later', () => {
    const slot = createPageSlot<string>('');
    const dispose = createRoot(dispose => {
      slot.use(() => 'claimed');
      return dispose;
    });
    // Before anything awaits: inside a real render a deferred effect would
    // leave the frame to paint once without the page's contribution.
    expect(slot.value()).toBe('claimed');
    dispose();
    expect(slot.value()).toBe('');
  });

  it('tracks what the page yields, so a page can swap its contribution', () => {
    const slot = createPageSlot<string>('');
    const [label, setLabel] = createSignal('Continue');
    const dispose = createRoot(dispose => {
      slot.use(label);
      return dispose;
    });
    expect(slot.value()).toBe('Continue');
    setLabel('Submit');
    expect(slot.value()).toBe('Submit');
    dispose();
  });

  it('leaves the region alone when a newer page has already claimed it', () => {
    const slot = createPageSlot<string>('');
    const disposeLeaving = createRoot(dispose => {
      slot.use(() => 'leaving');
      return dispose;
    });
    // The next page mounts before the one it replaces is disposed.
    createRoot(() => slot.use(() => 'arriving'));
    disposeLeaving();
    expect(slot.value()).toBe('arriving');
  });
});

describe('the SDK’s page slots', () => {
  it('hands the frame the trail and gives it up on dispose', () => {
    const crumbs = [{ label: 'Tally' }];
    const dispose = createRoot(dispose => {
      usePageTrail(() => crumbs);
      return dispose;
    });
    expect(pageTrail.value()).toBe(crumbs);
    dispose();
    expect(pageTrail.value()).toEqual([]);
  });

  it('hands the frame the action cluster’s render function, not its result', () => {
    const render = () => 'New';
    const dispose = createRoot(dispose => {
      usePageActions(render);
      return dispose;
    });
    expect(pageActions.value()).toBe(render);
    dispose();
    expect(pageActions.value()).toBeUndefined();
  });

  it('hands the frame the footer’s render function, not its result', () => {
    const render = () => 'Continue';
    const dispose = createRoot(dispose => {
      usePageFooter(render);
      return dispose;
    });
    expect(pageFooter.value()).toBe(render);
    dispose();
    expect(pageFooter.value()).toBeUndefined();
  });
});
