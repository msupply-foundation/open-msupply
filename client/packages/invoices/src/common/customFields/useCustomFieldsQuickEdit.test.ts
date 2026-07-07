import { renderHook } from '@testing-library/react';
import { useCustomFieldsQuickEdit } from './useCustomFieldsQuickEdit';

describe('useCustomFieldsQuickEdit', () => {
  it('keeps the local blob whole and sends only the edited key', () => {
    const update = jest.fn();
    const { result } = renderHook(() =>
      useCustomFieldsQuickEdit({ category: 'a', other: 'keep' }, update)
    );

    result.current({ category: 'b' });

    expect(update).toHaveBeenCalledWith({
      customFields: { category: 'b', other: 'keep' },
      patch: { category: 'b' },
    });
  });

  it('accumulates rapid edits to different fields so the last (debounce-surviving) mutation carries both', () => {
    const update = jest.fn();
    const { result, rerender } = renderHook(
      ({ customFields }) => useCustomFieldsQuickEdit(customFields, update),
      { initialProps: { customFields: { a: '1' } as Record<string, unknown> } }
    );

    result.current({ b: '2' });
    // The view writes the merged blob back to its draft state, re-rendering
    // the toolbar with the updated blob before the next edit.
    rerender({ customFields: { a: '1', b: '2' } });
    result.current({ c: '3' });

    expect(update).toHaveBeenLastCalledWith({
      customFields: { a: '1', b: '2', c: '3' },
      patch: { b: '2', c: '3' },
    });
  });

  it('keeps the latest value when the same field is edited twice', () => {
    const update = jest.fn();
    const { result } = renderHook(() => useCustomFieldsQuickEdit({}, update));

    result.current({ a: 'first' });
    result.current({ a: 'second' });

    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({ patch: { a: 'second' } })
    );
  });

  it('treats a missing blob as empty', () => {
    const update = jest.fn();
    const { result } = renderHook(() => useCustomFieldsQuickEdit(null, update));

    result.current({ a: '1' });

    expect(update).toHaveBeenCalledWith({
      customFields: { a: '1' },
      patch: { a: '1' },
    });
  });
});
