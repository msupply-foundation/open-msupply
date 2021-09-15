import { render } from '@testing-library/react';
import React, { FC } from 'react';
import { IntlTestProvider } from '../intl';
import { act } from 'react-dom/test-utils';
import { useDetailPanel } from './useDetailPanel';

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
    const { queryByText } = render(<DetailPanelExample />);
    expect(queryByText('More')).toBeInTheDocument();
  });

  it('Does not render an open button if open', () => {
    const { queryByText } = render(<DetailPanelExample />);

    act(() => {
      queryByText('More')?.click();
    });

    expect(queryByText('More')).not.toBeInTheDocument();
  });
});
