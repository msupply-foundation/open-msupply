import { act } from 'react-dom/test-utils';
import { useIntlUtils } from '@common/intl';
import { renderHookWithProvider } from '@common/utils';

describe('RTLProvider', () => {
  it('Sets the direction of the body to be rtl when a rtl language is the current locale', () => {
    const useHook = () => {
      const { i18n, isRtl } = useIntlUtils();
      return { isRtl, i18n };
    };
    const { result } = renderHookWithProvider(useHook);

    expect(result.current.isRtl).toBe(false);

    act(() => {
      result.current.i18n.changeLanguage('ar');
    });

    expect(result.current.isRtl).toBe(true);
  });
});
