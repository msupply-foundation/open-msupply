import { render, screen, waitFor } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import { useI18N } from '../intl/intlHelpers';
import { useAppTheme } from './useAppTheme';

describe('useAppTheme', () => {
  const AppThemeExample: FC = () => {
    const theme = useAppTheme();
    const i18n = useI18N();
    const changeLanguage = (language: string) => {
      i18n.changeLanguage(language);
    };

    return (
      <span>
        {String(theme.direction)}
        <button onClick={() => changeLanguage('ar')}>changeLanguage</button>
      </span>
    );
  };

  it('Correctly updates the direction when a language which is rtl is selected', () => {
    const { getByRole } = render(<AppThemeExample />);

    act(() => {
      const node = getByRole('button', { name: /changeLanguage/ });
      node.click();
    });

    waitFor(() => {
      const node = screen.queryByText('rtl');
      expect(node).toBeInTheDocument();
    });
  });
});
