import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { TestingProvider } from '@openmsupply-client/common';
import { selectVisibleError, useFormErrorStore } from './store';
import { CustomErrorValue, useFormField } from './useFormField';
import { useForm } from './useForm';

const reset = () => useFormErrorStore.setState({ forms: {} });

const Field = ({
  fieldId,
  value,
  required,
  customError,
  onRender,
}: {
  fieldId: string;
  value: string;
  required?: boolean;
  customError?: CustomErrorValue;
  onRender?: () => void;
}) => {
  onRender?.();
  const result = useFormField({
    formId: 'f1',
    fieldId,
    label: fieldId,
    value,
    required,
    customError,
  });
  return <div data-testid={`field-${fieldId}`}>{result.error ? '!' : ''}</div>;
};

describe('useFormField', () => {
  beforeEach(reset);

  it('registers on mount and unregisters on unmount', () => {
    const { unmount } = render(
      <TestingProvider>
        <Field fieldId="a" value="" />
      </TestingProvider>
    );
    expect(
      useFormErrorStore.getState().forms['f1']?.fields['a']
    ).toBeDefined();
    unmount();
    expect(
      useFormErrorStore.getState().forms['f1']?.fields['a']
    ).toBeUndefined();
  });

  it('mirrors a string customError into the immediate slot', () => {
    render(
      <TestingProvider>
        <Field fieldId="a" value="x" customError="bad" />
      </TestingProvider>
    );
    const field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBe('bad');
    expect(field?.submissionError).toBeNull();
  });

  it('routes { showOnSubmit: true } to the deferred slot', () => {
    render(
      <TestingProvider>
        <Field
          fieldId="a"
          value="x"
          customError={{ message: 'soft', showOnSubmit: true }}
        />
      </TestingProvider>
    );
    const field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBeNull();
    expect(field?.submissionError).toBe('soft');
  });

  it('moves a customError between slots when showOnSubmit toggles', () => {
    const { rerender } = render(
      <TestingProvider>
        <Field fieldId="a" value="x" customError="bad" />
      </TestingProvider>
    );
    let field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBe('bad');
    expect(field?.submissionError).toBeNull();

    rerender(
      <TestingProvider>
        <Field
          fieldId="a"
          value="x"
          customError={{ message: 'bad', showOnSubmit: true }}
        />
      </TestingProvider>
    );
    field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBeNull();
    expect(field?.submissionError).toBe('bad');

    rerender(
      <TestingProvider>
        <Field fieldId="a" value="x" customError={null} />
      </TestingProvider>
    );
    field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBeNull();
    expect(field?.submissionError).toBeNull();
  });

  it('flips required-error based on value', () => {
    const Container = () => {
      const [value, setValue] = useState('');
      return (
        <>
          <Field fieldId="a" value={value} required />
          <button onClick={() => setValue('done')}>fill</button>
        </>
      );
    };
    const { getByText } = render(
      <TestingProvider>
        <Container />
      </TestingProvider>
    );
    expect(
      useFormErrorStore.getState().forms['f1']?.fields['a']?.requiredError
    ).toBeTruthy();
    fireEvent.click(getByText('fill'));
    expect(
      useFormErrorStore.getState().forms['f1']?.fields['a']?.requiredError
    ).toBeNull();
  });

  it('isolates store-driven re-renders to the changed field', () => {
    // When field A's error changes via the store, only A should re-render —
    // the parent doesn't change, so React isn't propagating the render down.
    const aRender = jest.fn();
    const bRender = jest.fn();
    const MemoField = React.memo(Field);
    render(
      <TestingProvider>
        <MemoField fieldId="a" value="x" onRender={aRender} />
        <MemoField fieldId="b" value="y" onRender={bRender} />
      </TestingProvider>
    );
    const aBefore = aRender.mock.calls.length;
    const bBefore = bRender.mock.calls.length;

    act(() => {
      useFormErrorStore.getState().setCustomError('f1', 'a', 'oh no');
    });

    expect(aRender.mock.calls.length).toBeGreaterThan(aBefore);
    expect(bRender.mock.calls.length).toBe(bBefore);
  });
});

describe('useForm', () => {
  beforeEach(reset);

  it('clears the form on unmount by default', () => {
    const Form = () => {
      useForm('f1');
      return <Field fieldId="a" value="" />;
    };
    const { unmount } = render(
      <TestingProvider>
        <Form />
      </TestingProvider>
    );
    expect(useFormErrorStore.getState().forms['f1']).toBeDefined();
    unmount();
    expect(useFormErrorStore.getState().forms['f1']).toBeUndefined();
  });

  it('persists when persist:true', () => {
    const Form = () => {
      useForm('f1', { persist: true });
      return <Field fieldId="a" value="x" />;
    };
    const { unmount } = render(
      <TestingProvider>
        <Form />
      </TestingProvider>
    );
    unmount();
    // Field is unregistered, but the form record is left behind.
    const form = useFormErrorStore.getState().forms['f1'];
    expect(form).toBeDefined();
    expect(form?.fields['a']).toBeUndefined();
  });

  it('shows required errors on demand', () => {
    let formApi: ReturnType<typeof useForm> | null = null;
    const Form = () => {
      formApi = useForm('f1');
      return <Field fieldId="a" value="" required />;
    };
    render(
      <TestingProvider>
        <Form />
      </TestingProvider>
    );
    const fieldBefore = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(
      selectVisibleError(
        fieldBefore,
        useFormErrorStore.getState().forms['f1']?.showRequired ?? false
      )
    ).toBeNull();

    act(() => formApi!.showRequired());
    const fieldAfter = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(
      selectVisibleError(
        fieldAfter,
        useFormErrorStore.getState().forms['f1']?.showRequired ?? false
      )?.kind
    ).toBe('required');
  });
});
