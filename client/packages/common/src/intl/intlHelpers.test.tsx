import { screen, render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { LocalStorage } from '../localStorage';
import { useRtl } from './intlHelpers';

describe('useRtl', () => {
  const RTLExample = () => {
    const isRtl = useRtl();

    return <span>{String(isRtl)}</span>;
  };

  it('Correctly returns false when the language set is not a rtl language', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'ar');
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
