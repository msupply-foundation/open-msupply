import { renderHook } from '@testing-library/react';
import { useZodOptionsValidation } from './useZodOptionsValidation';
import { z } from 'zod';

const Union: z.ZodType = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Field'),
    field: z.union([z.string(), z.array(z.string())]),
    value1: z.string(),
  }),
  z.object({
    type: z.literal('Field2'),
    value2: z.string(),
  }),
]);

describe('useZodOptionsValidation', () => {
  it('should fail to validate an invalid object', () => {
    const data = { type: 'Invalid' };
    const result = renderHook(() => useZodOptionsValidation(Union, data));
    expect(result.result.current.errors).toBeDefined();
  });

  it('should fail to validate an invalid object field', () => {
    const data = { type: 'Field2', value1: 'value' };
    const result = renderHook(() => useZodOptionsValidation(Union, data));
    expect(result.result.current.errors).toBeDefined();
  });

  it('should fail to validate an invalid field type', () => {
    const data = {
      type: 'Field2',
      value1: 'value',
      field: 1,
    };
    const result = renderHook(() => useZodOptionsValidation(Union, data));
    expect(result.result.current.errors).toBeDefined();
  });

  it('should succeed to validate object', () => {
    const data = {
      type: 'Field',
      value1: 'value',
      field: ['field'],
    };
    const result3 = renderHook(() => useZodOptionsValidation(Union, data));
    expect(result3.result.current.errors).toBeUndefined();
  });
});
