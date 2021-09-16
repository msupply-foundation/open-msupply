import { render } from '@testing-library/react';
import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import {
  Action,
  IntlTestProvider,
  Section,
  setScreenSize_ONLY_FOR_TESTING,
  useDetailPanel,
} from '@openmsupply-client/common';
import DetailPanel from './DetailPanel';
import userEvent from '@testing-library/user-event';

describe('DetailPanel', () => {
  const DetailPanelExample: FC<{ sections: Section[]; actions: Action[] }> = ({
    sections,
    actions,
  }) => {
    const { OpenButton, setActions, setSections } = useDetailPanel();

    useEffect(() => setActions(actions), []);
    useEffect(() => setSections(sections), []);

    return (
      <IntlTestProvider locale="en">
        <div>{OpenButton}</div>
        <DetailPanel />
      </IntlTestProvider>
    );
  };

  // ensuring the drawer is closed for the test unless explicitly set to be a large screen
  beforeEach(() => setScreenSize_ONLY_FOR_TESTING(1000));

  it('Does not render when empty', () => {
    const actions: Action[] = [];
    const sections: Section[] = [];

    const { queryByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    expect(queryByTestId('detail-panel')).not.toBeInTheDocument();
  });

  it('Does not show by default on a small screen', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];

    const { queryByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    expect(queryByTestId('detail-panel')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('Does show by default on a large screen', () => {
    setScreenSize_ONLY_FOR_TESTING(2000);

    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];
    const { queryByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    expect(queryByTestId('detail-panel')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('Does show when opened', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];

    const { queryByTestId, queryByRole } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      userEvent.click(queryByRole('button', { name: /more/i }));
    });

    expect(queryByTestId('detail-panel')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('Does render the correct number of sections', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
      { titleKey: 'heading.comment', children: [<span key="0" />] },
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];
    const { queryAllByText, queryByRole } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      userEvent.click(queryByRole('button', { name: /more/i }));
    });

    expect(queryAllByText('Comment')).toHaveLength(3);
  });

  it('Does render the correct sections', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
      { titleKey: 'heading.additional-info', children: [<span key="0" />] },
    ];
    const { getByRole } = render(
      <DetailPanelExample actions={actions} sections={sections} />
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
    const actions: Action[] = [];
    const sections: Section[] = [
      {
        titleKey: 'heading.comment',
        children: [<span data-testid="child1" key="0" />],
      },
      {
        titleKey: 'heading.additional-info',
        children: [<span data-testid="child2" key="0" />],
      },
    ];
    const { getByRole, getByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
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
