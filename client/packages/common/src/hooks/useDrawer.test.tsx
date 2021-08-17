import { useDrawer } from '.';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

describe('useDrawer', () => {
  const UseDrawerExample = () => {
    const drawer = useDrawer();

    return (
      <>
        <button data-testid="button" onClick={drawer.open} />
        <button data-testid="button2" onClick={drawer.toggle} />
        <span>{String(drawer.isOpen)}</span>
      </>
    );
  };

  const SecondaryUseDrawerExample = () => {
    const drawer = useDrawer();

    return <span>{String(drawer.isOpen)}</span>;
  };

  it('sets the isOpen state to true when calling open', () => {
    const { getByText } = render(<UseDrawerExample />);

    act(() => {
      fireEvent.click(screen.getByTestId('button'));
    });

    expect(getByText(/true/i)).toBeInTheDocument();
  });

  it('sets the state of all instances of the hook when toggled ', () => {
    const { queryAllByText } = render(<UseDrawerExample />);
    render(<SecondaryUseDrawerExample />);

    act(() => {
      fireEvent.click(screen.getByTestId('button2'));
    });

    expect(queryAllByText(/true/i)).toHaveLength(2);
  });

  it('sets the localStorage value when toggling the drawer state', () => {
    render(<UseDrawerExample />);

    act(() => {
      fireEvent.click(screen.getByTestId('button'));
    });

    expect(localStorage.getItem('@openmsupply-client/appdrawer/open')).toBe(
      'true'
    );
  });
});
