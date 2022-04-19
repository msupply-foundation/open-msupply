import { render } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import {
  DetailPanelSection,
  setScreenSize_ONLY_FOR_TESTING,
  useDetailPanel,
} from '@openmsupply-client/common';
import { DetailPanel, DetailPanelPortal } from './DetailPanel';
import { TestingProvider } from '@common/utils';
import { PropsWithChildrenOnly } from '@common/types';

describe('DetailPanel', () => {
  const DetailPanelExample: FC<PropsWithChildrenOnly> = ({ children }) => {
    const { OpenButton } = useDetailPanel();

    return (
      <>
        <div>{OpenButton}</div>
        <DetailPanel />
        {children}
      </>
    );
  };

  const DetailPanelWithTwoSections: FC = () => (
    <DetailPanelPortal>
      <>
        <DetailPanelSection title="Comment">
          <div>comments</div>
        </DetailPanelSection>
        <DetailPanelSection title="Additional info">
          <div data-testid="child2">comments</div>
        </DetailPanelSection>
      </>
    </DetailPanelPortal>
  );

  // ensuring the drawer is closed for the test unless explicitly set to be a large screen
  beforeEach(() => setScreenSize_ONLY_FOR_TESTING(1000));

  it('Does not render when empty', () => {
    const { queryByTestId } = render(
      <TestingProvider>
        <DetailPanelExample />
      </TestingProvider>
    );

    expect(queryByTestId('detail-panel')).toHaveStyle({ width: 0 });
  });

  it('Does not show by default on a small screen', () => {
    const { queryByTestId } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelPortal />
        </DetailPanelExample>
      </TestingProvider>
    );

    expect(queryByTestId('detail-panel')).toHaveStyle({ width: 0 });
  });

  it('Does show by default on a large screen', () => {
    setScreenSize_ONLY_FOR_TESTING(2000);

    const { queryByTestId } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelPortal />
        </DetailPanelExample>
      </TestingProvider>
    );

    expect(queryByTestId('detail-panel')).not.toHaveStyle({ width: 0 });
  });

  it('Does show when opened', () => {
    const { queryByTestId, getByRole } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelPortal />
        </DetailPanelExample>
      </TestingProvider>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    expect(queryByTestId('detail-panel')).not.toHaveStyle({ width: 0 });
  });

  it('Does render the correct number of sections', () => {
    const { queryAllByText, getByRole } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelWithTwoSections />
        </DetailPanelExample>
      </TestingProvider>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    expect(queryAllByText('comments')).toHaveLength(2);
  });

  it('Does render the correct sections', () => {
    const { getByRole } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelWithTwoSections />
        </DetailPanelExample>
      </TestingProvider>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    const section1 = getByRole('button', { name: /comment/i });
    const section2 = getByRole('button', { name: /additional info/i });

    expect(section1).toBeInTheDocument();
    expect(section2).toBeInTheDocument();
  });

  it('renders the children of a section once expanded', () => {
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <DetailPanelExample>
          <DetailPanelWithTwoSections />
        </DetailPanelExample>
      </TestingProvider>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    const section2 = getByRole('button', { name: /additional info/i });

    act(() => {
      section2.click();
    });

    expect(getByTestId('child2')).toBeVisible();
  });
});
