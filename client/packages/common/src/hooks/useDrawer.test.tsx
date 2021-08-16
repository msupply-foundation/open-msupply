import { useDrawer } from '.';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

let mockStorage: Record<string, string> = {};

beforeAll(() => {
  global.Storage.prototype.setItem = jest.fn((key, value) => {
    mockStorage[key] = value;
  });
  global.Storage.prototype.getItem = jest.fn(key => {
    return mockStorage[key] ?? null;
  });
});

afterAll(() => {
  (global.Storage.prototype.setItem as jest.Mock).mockReset();
  (global.Storage.prototype.getItem as jest.Mock).mockReset();
});

beforeEach(() => {
  mockStorage = {};
});

describe('useDrawer', () => {
  const Test = () => {
    const drawer = useDrawer();

    return (
      <>
        <button data-testid="button" onClick={drawer.open} />
        <button data-testid="button2" onClick={drawer.toggle} />
        <span>{String(drawer.isOpen)}</span>
      </>
    );
  };

  const Test2 = () => {
    const drawer = useDrawer();

    return <span>{String(drawer.isOpen)}</span>;
  };

  it('sets the isOpen state to true when calling open', () => {
    const { getByText } = render(<Test />);
    fireEvent.click(screen.getByTestId('button'));
    expect(getByText(/true/i)).toBeInTheDocument();
  });

  it('sets the state of all instances of the hook when toggled ', () => {
    const { queryAllByText } = render(<Test />);
    render(<Test2 />);

    fireEvent.click(screen.getByTestId('button2'));

    expect(queryAllByText(/false/i)).toHaveLength(2);
  });

  it('sets the localStorage value when toggling the drawer state', () => {
    render(<Test />);

    fireEvent.click(screen.getByTestId('button'));

    expect(localStorage.getItem('@openmsupply-client/appdrawer/open')).toBe(
      'true'
    );
  });
});
