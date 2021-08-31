import { render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { LocalStorage } from '../localStorage';
import { RTLProvider } from './RTLProvider';

describe('RTLProvider', () => {
  it('Sets the direction of the body to be rtl when a rtl language is the current locale', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'ar');
    });

    render(
      <RTLProvider>
        <span>some text</span>{' '}
      </RTLProvider>
    );

    const node = screen.queryByText('some text')?.closest('div');

    expect(node).toHaveStyle('direction: rtl');
  });
});
