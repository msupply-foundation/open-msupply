import React, { FC } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { useDetailPanel } from './useDetailPanel';
import {
  TestingProvider,
  setScreenSize_ONLY_FOR_TESTING,
} from '../../utils/testing';

describe('useDetailPanel', () => {
  const DetailPanelExample: FC = () => {
    const { OpenButton } = useDetailPanel();

    return <div>{OpenButton}</div>;
  };

  it('Does render an open button by default', () => {
    const { getByRole } = render(
      <TestingProvider>
        <DetailPanelExample />
      </TestingProvider>
    );
    expect(getByRole('button', { name: /more/i })).toBeInTheDocument();
  });

  it('Does not render an open button if open', () => {
    setScreenSize_ONLY_FOR_TESTING(1000);

    const { getByRole, queryByRole } = render(
      <TestingProvider>
        <DetailPanelExample />
      </TestingProvider>
    );
    const button = getByRole('button', { name: /more/i });
    fireEvent.click(button);

    expect(queryByRole('button', { name: /more/i })).not.toBeInTheDocument();
  });
});
