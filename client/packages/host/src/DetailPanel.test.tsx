import { render } from '@testing-library/react';
import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import {
  Action,
  IntlTestProvider,
  Section,
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
    const actions: Action[] = [];
    const sections: Section[] = [];
    const { queryByTestId } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      queryByTestId('More')?.click();
    });

    expect(queryByTestId('detail-panel')).not.toBeInTheDocument();
  });

  it('Does render panel if actions provided', () => {
    const actions: Action[] = [
      { titleKey: 'link.backorders', onClick: () => {} },
    ];
    const sections: Section[] = [];
    const { queryByTestId, queryByText } = render(
      <DetailPanelExample actions={actions} sections={sections} />
    );

    act(() => {
      queryByText('More')?.click();
    });

    expect(queryByTestId('detail-panel')).toBeInTheDocument();
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
});
