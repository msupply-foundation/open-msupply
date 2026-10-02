import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { pageFooter } from './pageFooter';
import { usePageFooter } from '../plugin-sdk/navigation';

// The page-footer primitive (sdk-contract § the page contribution › rendering).
describe('usePageFooter', () => {
  it('hands the frame the render function and clears it when the page is disposed', () => {
    const render = () => 'Continue';
    const dispose = createRoot(dispose => {
      usePageFooter(render);
      return dispose;
    });
    expect(pageFooter()).toBe(render);
    dispose();
    expect(pageFooter()).toBeUndefined();
  });
});
