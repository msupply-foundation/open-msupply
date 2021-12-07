import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { LocalStorage } from '.';
import { BaseButton } from '@common/components';
import { useLocalStorage } from './useLocalStorage';

const UseLocalStorageExample = () => {
  const [value, setValue] = useLocalStorage('/appdrawer/open');

  return (
    <>
      <BaseButton onClick={() => setValue(!value)} />
      <span>{String(value)}</span>
    </>
  );
};

describe('useLocalStorage', () => {
  it('sets state and the corresponding local storage value', () => {
    render(<UseLocalStorageExample />);

    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    const value = LocalStorage.getItem('/appdrawer/open');

    expect(value).toBe(true);
  });
  it('re-renders if local storage is updated through the singleton interface', () => {
    render(<UseLocalStorageExample />);

    act(() => {
      fireEvent.click(screen.getByRole('button'));
      LocalStorage.setItem('/appdrawer/open', true);
    });

    const node = screen.getByText('true');

    expect(node).toBeTruthy;
  });
});
