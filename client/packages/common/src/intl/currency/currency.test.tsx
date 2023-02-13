import { renderHookWithProvider } from '@common/utils';
import { useCurrency } from './currency';

describe('currency formatting - en', () => {
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed', () => {
    const { result } = renderHookWithProvider(useCurrency);
    const f1 = result.current.c(1.11111111111).format();
    expect(f1).toBe('$1.1111111111');
  });
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed even with large numbers', () => {
    const { result } = renderHookWithProvider(useCurrency);

    const f1 = result.current.c(111_111.11111111111).format();
    expect(f1).toBe('$111,111.1111111111');
  });

  it('does not drop non-trailing zeroes', () => {
    const { result } = renderHookWithProvider(useCurrency);

    const f1 = result.current.c(111.10001).format();
    expect(f1).toBe('$111.10001');
  });

  it('does drop trailing zeroes', () => {
    const { result } = renderHookWithProvider(useCurrency);

    const f1 = result.current.c('111.11000').format();
    expect(f1).toBe('$111.11');
  });
  it('has a minimum of two trailing zeroes, adding one if needed', () => {
    const { result } = renderHookWithProvider(useCurrency);

    const f1 = result.current.c('111.1000').format();
    expect(f1).toBe('$111.10');
  });
  it('has a minimum of two trailing zeroes, adding two if needed', () => {
    const { result } = renderHookWithProvider(useCurrency);

    const f1 = result.current.c(111).format();
    expect(f1).toBe('$111.00');
  });
});

describe('currency formatting - fr', () => {
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });
    const f1 = result.current.c(1.11111111111).format();
    expect(f1).toBe('1,1111111111 XOF');
  });
  it('formats a string with up to the precision number of decimal places, dropping decimal places where needed even with large numbers', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });

    const f1 = result.current.c(111_111.11111111111).format();
    expect(f1).toBe('111.111,1111111111 XOF');
  });

  it('does not drop non-trailing zeroes', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });

    const f1 = result.current.c(111.10001).format();
    expect(f1).toBe('111,10001 XOF');
  });

  it('does drop trailing zeroes', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });

    // Note: Using a string to pass into c as formatters will generally
    // auto clear trailing zeroes when literal numbers.
    const f1 = result.current.c('111,11000').format();
    expect(f1).toBe('111,11 XOF');
  });
  it('has a minimum of two trailing zeroes, adding one if needed', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });

    const f1 = result.current.c('111,1000').format();
    expect(f1).toBe('111,10 XOF');
  });
  it('has a minimum of two trailing zeroes, adding two if needed', () => {
    const { result } = renderHookWithProvider(useCurrency, {
      providerProps: { locale: 'fr' },
    });

    const f1 = result.current.c(111).format();
    expect(f1).toBe('111,00 XOF');
  });
});
