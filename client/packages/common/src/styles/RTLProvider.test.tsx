import { act } from 'react';
import { useIntlUtils } from '@common/intl';
import { renderHookWithProvider } from '@common/utils';

describe('RTLProvider', () => {
  it('Sets the direction of the body to be rtl when a rtl language is the current locale', () => {
    const useHook = () => {
      const { isRtl, changeLanguage } = useIntlUtils();
      return { isRtl, changeLanguage };
    };
    const { result } = renderHookWithProvider(useHook);

    expect(result.current.isRtl).toBe(false);

    act(() => {
      result.current.changeLanguage('ar');
    });

    expect(result.current.isRtl).toBe(true);
  });
});
