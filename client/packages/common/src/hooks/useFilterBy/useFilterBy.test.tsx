import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useFilterBy } from './useFilterBy';

describe('useFilterBy', () => {
  it('is truthy', () => {
    expect(useFilterBy).toBeTruthy();
  });

  it('returns the correct initial state', () => {
    const { result } = renderHook(() =>
      useFilterBy({
        comment: { equalTo: 'a' },
        allocatedDatetime: { equalTo: '1/1/2020' },
      })
    );

    expect(result.current.filterBy).toEqual({
      comment: { equalTo: 'a' },
      allocatedDatetime: { equalTo: '1/1/2020' },
    });
  });

  it('updates date filter values', () => {
    const { result } = renderHook(() =>
      useFilterBy({
        comment: { equalTo: 'a' },
        allocatedDatetime: { equalTo: '1/1/2020' },
      })
    );

    const now = new Date();

    act(() => {
      result.current.onChangeDateFilterRule(
        'allocatedDatetime',
        'beforeOrEqualTo',
        now
      );
    });

    expect(
      result.current.filterBy?.['allocatedDatetime']?.beforeOrEqualTo
    ).toEqual(now);
  });

  it('updates date filters', () => {
    const { result } = renderHook(() =>
      useFilterBy({
        comment: { equalTo: 'a' },
        allocatedDatetime: { equalTo: '1/1/2020' },
      })
    );

    const now = new Date();

    act(() => {
      result.current.onChangeDateFilterRule(
        'allocatedDatetime',
        'beforeOrEqualTo',
        now
      );
    });

    expect(result.current.filterBy).toEqual({
      comment: { equalTo: 'a' },
      allocatedDatetime: { beforeOrEqualTo: now },
    });
  });

  it('updates string filter values', () => {
    const { result } = renderHook(() =>
      useFilterBy({ comment: { equalTo: 'a' } })
    );

    act(() => {
      result.current.onChangeStringFilterRule('comment', 'equalTo', 'josh');
    });

    expect(result.current.filterBy?.['comment']?.equalTo).toEqual('josh');
  });

  it('updates string filters', () => {
    const { result } = renderHook(() =>
      useFilterBy({
        comment: { equalTo: 'a' },
        allocatedDatetime: { equalTo: '1/1/2020' },
      })
    );

    act(() => {
      result.current.onChangeStringFilterRule('comment', 'like', 'josh');
    });

    expect(result.current.filterBy).toEqual({
      comment: { like: 'josh' },
      allocatedDatetime: { equalTo: '1/1/2020' },
    });
  });

  it('clears string filters', () => {
    const { result } = renderHook(() =>
      useFilterBy({
        comment: { equalTo: 'a' },
        allocatedDatetime: { equalTo: '1/1/2020' },
      })
    );

    act(() => {
      result.current.onClearFilterRule('comment');
    });

    expect(result.current.filterBy).toEqual({
      allocatedDatetime: { equalTo: '1/1/2020' },
    });
  });
});
