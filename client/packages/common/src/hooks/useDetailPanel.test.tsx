import React, { FC } from 'react';
import { render } from '@testing-library/react';
import { IntlTestProvider } from '../intl';
import { act } from 'react-dom/test-utils';
import { useDetailPanel } from './useDetailPanel';
import userEvent from '@testing-library/user-event';
import { setScreenSize_ONLY_FOR_TESTING } from '../utils/testing';

describe('useDetailPanel', () => {
  const DetailPanelExample: FC = () => {
    const { OpenButton } = useDetailPanel();

    return (
      <IntlTestProvider locale="en">
        <div>{OpenButton}</div>
      </IntlTestProvider>
    );
  };

  it('Does render an open button by default', () => {
    const { getByRole } = render(<DetailPanelExample />);
    expect(getByRole('button', { name: /more/i })).toBeInTheDocument();
  });

  it('Does not render an open button if open', () => {
    setScreenSize_ONLY_FOR_TESTING(1000);

    const { getByRole, queryByRole } = render(<DetailPanelExample />);
    const node = getByRole('button', { name: /more/i });

    act(() => {
      userEvent.click(node);
    });

    expect(queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
  });
});
