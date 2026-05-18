import React from 'react';
import { act, render } from '@testing-library/react';
import { TestingProvider } from '@openmsupply-client/common';
import { useFormErrorStore } from '../../../../hooks/useFormErrors/store';
import { TextInputCell } from './TextInputCell';

const reset = () => useFormErrorStore.setState({ forms: {} });

// Minimal MRT_Cell shim — the cell only ever calls getValue<string>().
const stubCell = (value: string) =>
  ({
    getValue: () => value,
  }) as unknown as Parameters<typeof TextInputCell>[0]['cell'];

describe('TextInputCell — form-error integration', () => {
  beforeEach(reset);

  it('registers itself when formError is provided', () => {
    render(
      <TestingProvider>
        <TextInputCell
          cell={stubCell('hello')}
          updateFn={() => {}}
          formError={{ formId: 'f1', fieldId: 'cell-1', label: 'Cell 1' }}
        />
      </TestingProvider>
    );

    const field =
      useFormErrorStore.getState().forms['f1']?.fields['cell-1'];
    expect(field).toBeDefined();
    expect(field?.label).toBe('Cell 1');
  });

  it('reflects an external customError into the store', () => {
    render(
      <TestingProvider>
        <TextInputCell
          cell={stubCell('hello')}
          updateFn={() => {}}
          formError={{ formId: 'f1', fieldId: 'cell-1', label: 'Cell 1' }}
          customError="bad"
        />
      </TestingProvider>
    );

    const field =
      useFormErrorStore.getState().forms['f1']?.fields['cell-1'];
    expect(field?.customError).toBe('bad');
  });

  it('reflects store customError changes back into the field state', () => {
    render(
      <TestingProvider>
        <TextInputCell
          cell={stubCell('hello')}
          updateFn={() => {}}
          formError={{ formId: 'f1', fieldId: 'cell-1', label: 'Cell 1' }}
        />
      </TestingProvider>
    );

    expect(
      useFormErrorStore.getState().forms['f1']?.fields['cell-1']?.customError
    ).toBeNull();

    act(() => {
      useFormErrorStore.getState().setCustomError('f1', 'cell-1', 'oops');
    });

    expect(
      useFormErrorStore.getState().forms['f1']?.fields['cell-1']?.customError
    ).toBe('oops');
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(
      <TestingProvider>
        <TextInputCell
          cell={stubCell('hello')}
          updateFn={() => {}}
          formError={{ formId: 'f1', fieldId: 'cell-1', label: 'Cell 1' }}
        />
      </TestingProvider>
    );

    expect(
      useFormErrorStore.getState().forms['f1']?.fields['cell-1']
    ).toBeDefined();
    unmount();
    expect(
      useFormErrorStore.getState().forms['f1']?.fields['cell-1']
    ).toBeUndefined();
  });
});
