import { render, screen } from '@testing-library/react';
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

  it('Does not render empty panel', () => {
    setScreenSize_ONLY_FOR_TESTING(1000);
    const actions: Action[] = [];
    const sections: Section[] = [];
    const { queryByText, queryByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      // queryByText('More')?.click();
    });

    expect(queryByTestId('detail-panel')).not.toBeInTheDocument();
  });

  it('Does render panel if actions provided', () => {
    setScreenSize_ONLY_FOR_TESTING(100);
    const actions: Action[] = [
      { titleKey: 'link.backorders', onClick: () => {} },
    ];
    const sections: Section[] = [];
    const { getByTestId, queryByTestId, queryByText } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    const node = queryByText(/more/i);
    console.log('-------------------------------------------');
    console.log('node', node);
    console.log('-------------------------------------------');

    act(() => {
      // queryByText('More')?.click();
    });

    expect(queryByTestId('detail-panel')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('Does render panel if sections provided', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];
    const { queryByTestId, queryByText } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      queryByText('More')?.click();
    });

    expect(queryByTestId('detail-panel')).toBeInTheDocument();
  });

  it('Does render the correct number of sections', () => {
    const actions: Action[] = [];
    const sections: Section[] = [
      { titleKey: 'heading.comment', children: [<span key="0" />] },
      { titleKey: 'heading.comment', children: [<span key="0" />] },
      { titleKey: 'heading.comment', children: [<span key="0" />] },
    ];
    const { queryAllByText, queryByText } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      queryByText('More')?.click();
    });

    expect(queryAllByText('Comment')).toHaveLength(3);
  });

  it('Does render the correct sections', () => {
    setScreenSize_ONLY_FOR_TESTING(1000);
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
    setScreenSize_ONLY_FOR_TESTING(1000);
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
    const { getByRole } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      getByRole('button', { name: /more/i }).click();
    });

    const section2 = getByRole('button', { name: /additional info/i });

    act(() => {
      section2.click();
    });

    expect(screen.getByTestId('child2')).toBeVisible();
  });
});
