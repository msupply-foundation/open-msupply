import { render, screen } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import { LocalStorage } from '../localStorage';
import { useAppTheme } from './useAppTheme';

describe('useAppTheme', () => {
  const AppThemeExample: FC = () => {
    const theme = useAppTheme();

    return <span>{String(theme.direction)}</span>;
  };

  it('Correctly updates the direction when a language which is rtl is seleted', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'ar');
    });

    render(<AppThemeExample />);

    const node = screen.queryByText('rtl');

    expect(node).toBeInTheDocument();
  });
});
