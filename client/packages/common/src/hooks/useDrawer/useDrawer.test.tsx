import React, {act} from 'react';
import { useDrawer } from './useDrawer';
import { render, screen, fireEvent } from '@testing-library/react';
import LocalStorage from '../../localStorage/LocalStorage';

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
      fireEvent.click(screen.getByTestId('button2'));
    });

    expect(LocalStorage.getItem('/appdrawer/open')).toBe(true);
  });

  it('is updated when updated local storage through the API interface', () => {
    render(<UseDrawerExample />);

    act(() => {
      LocalStorage.setItem('/appdrawer/open', true);
    });

    const node = screen.getByText('true');

    expect(node).toBeInTheDocument();
  });
});
