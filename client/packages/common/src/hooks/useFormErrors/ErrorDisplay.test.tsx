import React from 'react';
import { act, render } from '@testing-library/react';
import { TestingProvider } from '@openmsupply-client/common';
import { useFormErrorStore } from './store';
import {
  ErrorDisplay,
  FormErrorListEntry,
  useFormErrorList,
} from './ErrorDisplay';

const reset = () => useFormErrorStore.setState({ forms: {} });

const seedField = (
  formId: string,
  fieldId: string,
  label: string,
  customError: string | null
) => {
  const s = useFormErrorStore.getState();
  s.registerField(formId, fieldId, label);
  s.setCustomError(formId, fieldId, customError);
};

describe('ErrorDisplay (formId mode)', () => {
  beforeEach(reset);

  it('hides itself when there are no visible errors', () => {
    const { queryByRole } = render(
      <TestingProvider>
        <ErrorDisplay formId="f1" />
      </TestingProvider>
    );
    expect(queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders one bullet per visible error from the store', () => {
    seedField('f1', 'name', 'Name', 'Required');
    seedField('f1', 'rate', 'Rate', 'Too big');

    const { getByText } = render(
      <TestingProvider>
        <ErrorDisplay formId="f1" />
      </TestingProvider>
    );

    expect(getByText('- Name: Required')).toBeInTheDocument();
    expect(getByText('- Rate: Too big')).toBeInTheDocument();
  });

  it('updates reactively when the store changes', () => {
    const { queryByText, getByText } = render(
      <TestingProvider>
        <ErrorDisplay formId="f1" />
      </TestingProvider>
    );
    expect(queryByText('- Name: Required')).not.toBeInTheDocument();

    act(() => seedField('f1', 'name', 'Name', 'Required'));
    expect(getByText('- Name: Required')).toBeInTheDocument();
  });
});

describe('ErrorDisplay (items mode)', () => {
  beforeEach(reset);

  it('renders the supplied items verbatim', () => {
    const items = [
      { key: 'a', label: 'Alpha', message: 'oops' },
      { key: 'b', label: 'Beta', message: 'nope' },
    ];

    const { getByText } = render(
      <TestingProvider>
        <ErrorDisplay items={items} />
      </TestingProvider>
    );

    expect(getByText('- Alpha: oops')).toBeInTheDocument();
    expect(getByText('- Beta: nope')).toBeInTheDocument();
  });

  it('ignores the store entirely when items is supplied', () => {
    seedField('f1', 'name', 'Name', 'StoreError');

    const items = [{ key: 'a', label: 'Override', message: 'fromProp' }];
    const { getByText, queryByText } = render(
      <TestingProvider>
        <ErrorDisplay formId="f1" items={items} />
      </TestingProvider>
    );

    expect(getByText('- Override: fromProp')).toBeInTheDocument();
    expect(queryByText('- Name: StoreError')).not.toBeInTheDocument();
  });

  it('hides itself when items is empty', () => {
    const { queryByRole } = render(
      <TestingProvider>
        <ErrorDisplay items={[]} />
      </TestingProvider>
    );
    expect(queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('useFormErrorList', () => {
  beforeEach(reset);

  const Probe = ({
    onResult,
  }: {
    onResult: (v: FormErrorListEntry[]) => void;
  }) => {
    const list = useFormErrorList('f1');
    onResult(list);
    return null;
  };

  it('returns the same fieldId/label/message entries the default ErrorDisplay would render', () => {
    seedField('f1', 'name', 'Name', 'Required');
    seedField('f1', 'rate', 'Rate', 'Too big');

    let result: FormErrorListEntry[] | undefined;
    render(
      <TestingProvider>
        <Probe onResult={v => (result = v)} />
      </TestingProvider>
    );

    expect(result).toEqual([
      { fieldId: 'name', label: 'Name', message: 'Required' },
      { fieldId: 'rate', label: 'Rate', message: 'Too big' },
    ]);
  });

  it('returns a stable reference when nothing changes', () => {
    seedField('f1', 'name', 'Name', 'Required');

    const captured: unknown[] = [];
    const { rerender } = render(
      <TestingProvider>
        <Probe onResult={v => captured.push(v)} />
      </TestingProvider>
    );
    rerender(
      <TestingProvider>
        <Probe onResult={v => captured.push(v)} />
      </TestingProvider>
    );

    // Custom equality fn means subsequent reads should yield the same
    // reference when nothing has changed.
    expect(captured[0]).toBe(captured[1]);
  });
});
