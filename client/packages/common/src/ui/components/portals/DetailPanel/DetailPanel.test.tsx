import { render } from '@testing-library/react';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import {
  DetailPanelSection,
  IntlTestProvider,
  setScreenSize_ONLY_FOR_TESTING,
  useDetailPanel,
} from '@openmsupply-client/common';
import { DetailPanel, DetailPanelPortal } from './DetailPanel';

describe('DetailPanel', () => {
  const DetailPanelExample: FC = ({ children }) => {
    const { OpenButton } = useDetailPanel();

    return (
      <IntlTestProvider locale="en">
        <div>{OpenButton}</div>
        <DetailPanel />
        {children}
      </IntlTestProvider>
    );
  };

  const DetailPanelWithTwoSections: FC = () => (
    <DetailPanelPortal>
      <>
        <DetailPanelSection titleKey="heading.comment">
          <div>comments</div>
        </DetailPanelSection>
        <DetailPanelSection titleKey="heading.additional-info">
          <div data-testid="child2">comments</div>
        </DetailPanelSection>
      </>
    </DetailPanelPortal>
  );

  // ensuring the drawer is closed for the test unless explicitly set to be a large screen
  beforeEach(() => setScreenSize_ONLY_FOR_TESTING(1000));

  it('Does not render when empty', () => {
    const { queryByTestId } = render(<DetailPanelExample />);

    expect(queryByTestId('detail-panel')).toHaveStyle({ width: 0 });
  });

  it('Does not show by default on a small screen', () => {
    const { queryByTestId } = render(
      <DetailPanelExample>
        <DetailPanelPortal />
      </DetailPanelExample>
    );

    expect(queryByTestId('detail-panel')).toHaveStyle({ width: 0 });
  });

  it('Does show by default on a large screen', () => {
    setScreenSize_ONLY_FOR_TESTING(2000);

    const { queryByTestId } = render(
      <DetailPanelExample>
        <DetailPanelPortal />
      </DetailPanelExample>
    );

    expect(queryByTestId('detail-panel')).not.toHaveStyle({ width: 0 });
  });

  it('Does show when opened', () => {
    const { queryByTestId, getByRole } = render(
      <DetailPanelExample>
        <DetailPanelPortal />
      </DetailPanelExample>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    expect(queryByTestId('detail-panel')).not.toHaveStyle({ width: 0 });
  });

  it('Does render the correct number of sections', () => {
    const { queryAllByText, getByRole } = render(
      <DetailPanelExample>
        <DetailPanelWithTwoSections />
      </DetailPanelExample>
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    expect(queryAllByText('comments')).toHaveLength(2);
  });

  it('Does render the correct sections', () => {
    const { getByRole } = render(
      <DetailPanelExample>
        <DetailPanelWithTwoSections />
      </DetailPanelExample>
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
      <DetailPanelExample>
        <DetailPanelWithTwoSections />
      </DetailPanelExample>
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
