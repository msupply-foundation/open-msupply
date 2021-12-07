import { renderHook } from '@testing-library/react-hooks';
import { useContentAreaHeight } from '.';
import { useAppTheme } from '@common/styles';

describe('useContentAreaHeight', () => {
  beforeEach(() => {
    window.resizeTo(1000, 1000);
  });

  it('calculates the correct content height', () => {
    const { result } = renderHook(() => {
      const theme = useAppTheme();
      theme.mixins.footer = { height: 0 };
      return useContentAreaHeight();
    });

    expect(result.current).toBe(1000);
  });

  it('calculates the correct content height accounting for a footer', () => {
    const { result } = renderHook(() => {
      const theme = useAppTheme();
      theme.mixins.footer = { height: 100 };
      return useContentAreaHeight();
    });

    expect(result.current).toBe(900);
  });
});
