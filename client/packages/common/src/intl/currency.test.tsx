import { useCurrency } from './currency';
import { renderHook } from '@testing-library/react-hooks';

describe('currency formatting', () => {
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed', () => {
    const { result } = renderHook(useCurrency);
    const f1 = result.current.c(1.11111111111).format();
    expect(f1).toBe('$1.1111111111');
  });
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed even with large numbers', () => {
    const { result } = renderHook(useCurrency);

    const f1 = result.current.c(111_111.11111111111).format();
    expect(f1).toBe('$111,111.1111111111');
  });

  it('does not drop non-trailing zeroes', () => {
    const { result } = renderHook(useCurrency);

    const f1 = result.current.c(111.10001).format();
    expect(f1).toBe('$111.10001');
  });

  it('does drop trailing zeroes', () => {
    const { result } = renderHook(useCurrency);

    const f1 = result.current.c(111.1).format();
    expect(f1).toBe('$111.1');
  });
});
