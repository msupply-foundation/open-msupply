import { render, screen } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import { LocalStorage } from '../localStorage';
import { useAppTheme, useRtl } from './hooks';

describe('useRtl', () => {
  const RTLExample = () => {
    const isRtl = useRtl();

    return <span>{String(isRtl)}</span>;
  };

  it('Correctly returns false when the language set is not a rtl language', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'fr');
    });
    render(<RTLExample />);

    const node = screen.queryByText('true');

    expect(node).toBeInTheDocument();
  });

  it('Correctly returns true when the language set is not a rtl language', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'en');
    });
    render(<RTLExample />);

    const node = screen.queryByText('false');

    expect(node).toBeInTheDocument();
  });
});

describe('useAppTheme', () => {
  const AppThemeExample: FC = () => {
    const theme = useAppTheme();

    return <span>{String(theme.direction)}</span>;
  };

  it('Correctly updates the direction when a language which is rtl is seleted', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'fr');
    });

    render(<AppThemeExample />);

    const node = screen.queryByText('rtl');

    expect(node).toBeInTheDocument();
  });
});
