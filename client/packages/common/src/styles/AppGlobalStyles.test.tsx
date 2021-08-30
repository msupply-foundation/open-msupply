import { render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { LocalStorage } from '../localStorage';
import { AppGlobalStyles } from './AppGlobalStyles';

describe('AppGlobalStyles', () => {
  it('Sets the direction of the body to be rtl when a rtl language is the current locale', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'fr');
    });

    const { baseElement } = render(<AppGlobalStyles />);

    expect(baseElement).toHaveStyle('direction: rtl');
  });
});
