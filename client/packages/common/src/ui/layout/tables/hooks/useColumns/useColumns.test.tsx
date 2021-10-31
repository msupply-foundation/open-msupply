import { renderHook } from '@testing-library/react-hooks';
import { ColumnAlign, ColumnFormat } from '../..';
import { useColumns } from '../../..';
import { DomainObject } from '../../../../..';

interface Test extends DomainObject {
  id: string;
}

describe('useColumns', () => {
  it('assigns sensible defaults for an unspecified column', () => {
    const { result } = renderHook(() => useColumns<Test>([{ key: 'default' }]));

    const defaults = {
      format: ColumnFormat.Text,
      sortable: true,
      sortInverted: false,
      sortDescFirst: false,
      align: ColumnAlign.Left,
      width: 100,
      minWidth: 100,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
    expect(result.current[0]?.Cell).toBeTruthy();
    expect(result.current[0]?.Header).toBeTruthy();
    expect(result.current[0]?.accessor).toBeTruthy();
    expect(result.current[0]?.formatter).toBeTruthy();
  });

  it('assigns sensible defaults for an integer column', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', format: ColumnFormat.Integer }])
    );

    const defaults = {
      format: ColumnFormat.Integer,
      sortable: true,
      sortInverted: false,
      sortDescFirst: false,
      align: ColumnAlign.Right,
      width: 100,
      minWidth: 100,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
    expect(result.current[0]?.Cell).toBeTruthy();
    expect(result.current[0]?.Header).toBeTruthy();
    expect(result.current[0]?.accessor).toBeTruthy();
    expect(result.current[0]?.formatter).toBeTruthy();
  });

  it('assigns sensible defaults for a "real" type column', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', format: ColumnFormat.Real }])
    );

    const defaults = {
      format: ColumnFormat.Real,
      sortable: true,
      sortInverted: false,
      sortDescFirst: false,
      align: ColumnAlign.Right,
      width: 100,
      minWidth: 100,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
    expect(result.current[0]?.Cell).toBeTruthy();
    expect(result.current[0]?.Header).toBeTruthy();
    expect(result.current[0]?.accessor).toBeTruthy();
    expect(result.current[0]?.formatter).toBeTruthy();
  });

  it('assigns sensible defaults for a date type column', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', format: ColumnFormat.Date }])
    );

    const defaults = {
      format: ColumnFormat.Date,
      sortable: true,
      sortInverted: true,
      sortDescFirst: true,
      align: ColumnAlign.Right,
      width: 100,
      minWidth: 100,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
    expect(result.current[0]?.Cell).toBeTruthy();
    expect(result.current[0]?.Header).toBeTruthy();
    expect(result.current[0]?.accessor).toBeTruthy();
    expect(result.current[0]?.formatter).toBeTruthy();
  });

  it('uses the width as specified for the minWidth if unspecified', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', width: 200 }])
    );

    const defaults = {
      width: 200,
      minWidth: 200,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
  });

  it('uses the correct width and min width if specified', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', width: 200, minWidth: 100 }])
    );

    const defaults = {
      width: 200,
      minWidth: 100,
    };

    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
  });

  it('uses the correct width and min width if specified', () => {
    const { result } = renderHook(() =>
      useColumns<Test>([{ key: 'default', width: 200, minWidth: 100 }])
    );
    const defaults = { width: 200, minWidth: 100 };
    expect(result.current[0]).toEqual(expect.objectContaining(defaults));
  });

  it('has a stable reference when re-rendering', () => {
    const { result, rerender } = renderHook(() =>
      useColumns<Test>([{ key: 'default', format: ColumnFormat.Integer }])
    );
    rerender();
    expect(result.all[0]).toBe(result.all[1]);
  });
});
