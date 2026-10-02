import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { pageActions } from './pageActions';
import { usePageActions } from '../plugin-sdk/navigation';

// The page-actions primitive (sdk-contract § the page contribution ›
// rendering).
describe('usePageActions', () => {
  it('hands the frame the render function and clears it when the page is disposed', () => {
    const render = () => 'New';
    const dispose = createRoot(dispose => {
      usePageActions(render);
      return dispose;
    });
    expect(pageActions()).toBe(render);
    dispose();
    expect(pageActions()).toBeUndefined();
  });
});
