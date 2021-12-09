import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { BrowserRouter } from 'react-router-dom';
import { Route, Routes } from 'react-router';

import { useSearchParameters } from './useSearchParameters';

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
    </div>
  );
};

const Example = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Component />} />
    </Routes>
  </BrowserRouter>
);

describe('useSearchParameters', () => {
  it('has a blank initial state', () => {
    render(<Example />);

    expect(window.location.search).toEqual('');
  });

  it('correctly sets search parameter value', () => {
    const { getByRole } = render(<Example />);

    const node = getByRole('button', { name: /test-one/i });
    act(() => node.click());

    expect(window.location.search).toEqual('?test=one');
  });

  it('correctly updates search parameter value', () => {
    const { getByRole } = render(<Example />);

    const node1 = getByRole('button', { name: /test-one/i });
    act(() => node1.click());

    const node2 = getByRole('button', { name: /test-two/i });
    act(() => node2.click());

    expect(window.location.search).toEqual('?test=two');
  });

  it('correctly adds a search parameter without changing others', () => {
    const { getByRole } = render(<Example />);

    const node1 = getByRole('button', { name: /test-one/i });
    act(() => node1.click());

    const node2 = getByRole('button', { name: /id-nine/i });
    act(() => node2.click());

    expect(window.location.search).toEqual('?test=one&id=9');
  });
});
