import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { Route, Routes } from 'react-router';

import { useSearchParameters } from './useSearchParameters';

const ShowParams = () => {
  const params: Record<string, string> = {};
  const [searchParams] = useSearchParams();
  searchParams.forEach((value, key) => (params[key] = value));
  return <pre>{JSON.stringify(params)}</pre>;
};

const Component: React.FC = () => {
  const searchParams = useSearchParameters();

  return (
    <div>
      <button onClick={() => searchParams.set({ test: 'one' })}>
        test-one
      </button>
      <button onClick={() => searchParams.set({ test: 'two' })}>
        test-two
      </button>
      <button onClick={() => searchParams.set({ id: '9' })}>id-nine</button>
      <ShowParams />
    </div>
  );
};

const Example = () => (
  <MemoryRouter initialEntries={['/test']}>
    <Routes>
      <Route path="test" element={<Component />} />
    </Routes>
  </MemoryRouter>
);

describe('useSearchParameters', () => {
  it('has a blank initial state', () => {
    const { getByText } = render(<Example />);

    expect(getByText('{}')).toBeInTheDocument();
  });

  it('correctly sets search parameter value', () => {
    const { getByRole, getByText } = render(<Example />);

    const node = getByRole('button', { name: /test-one/i });
    act(() => node.click());

    expect(getByText('{"test":"one"}')).toBeInTheDocument();
  });

  it('correctly updates search parameter value', () => {
    const { getByRole, getByText } = render(<Example />);

    const node1 = getByRole('button', { name: /test-one/i });
    act(() => node1.click());

    const node2 = getByRole('button', { name: /test-two/i });
    act(() => node2.click());

    expect(getByText('{"test":"two"}')).toBeInTheDocument();
  });

  it('correctly adds a search parameter without changing others', () => {
    const { getByRole, getByText } = render(<Example />);

    const node1 = getByRole('button', { name: /test-one/i });
    act(() => node1.click());

    const node2 = getByRole('button', { name: /id-nine/i });
    act(() => node2.click());

    expect(getByText('{"test":"one","id":"9"}')).toBeInTheDocument();
  });
});
