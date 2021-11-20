import { render, screen, waitFor } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import { useI18N } from '../intl/intlHelpers';
import { LocalStorage } from '../localStorage';
import { RTLProvider } from './RTLProvider';

const RTLProviderExample: FC = () => {
  const i18n = useI18N();
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <RTLProvider>
      <span>some text</span>{' '}
      <button onClick={() => changeLanguage('ar')}>changeLanguage</button>
    </RTLProvider>
  );
};

describe('RTLProvider', () => {
  it('Sets the direction of the body to be rtl when a rtl language is the current locale', () => {
    act(() => {
      LocalStorage.setItem('/localisation/locale', 'ar');
    });

    const { getByRole } = render(<RTLProviderExample />);

    act(() => {
      const node = getByRole('button', { name: /changeLanguage/ });
      node.click();
    });

    waitFor(() => {
      const node = screen.queryByText('some text')?.closest('div');
      expect(node).toHaveStyle('direction: rtl');
    });
  });
});
