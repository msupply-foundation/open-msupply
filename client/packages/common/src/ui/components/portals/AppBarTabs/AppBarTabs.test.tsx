import React, { FC } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AppBarTabsPortal, AppBarTabs } from './AppBarTabs';

describe('AppBarTabs', () => {
  const TestAppBarTabs: FC<{ initialShow: boolean }> = ({ initialShow }) => {
    const [show, setShow] = React.useState(initialShow);

    return (
      <>
        <button onClick={() => setShow(state => !state)} />
        {show && (
          <div id="source">
            <AppBarTabs />
          </div>
        )}

        <div data-testid="2">
          <AppBarTabsPortal>
            <span>mark</span>
          </AppBarTabsPortal>
        </div>
      </>
    );
  };

  it('Portal children are rendered under the source', () => {
    const { getByText } = render(<TestAppBarTabs initialShow />);

    const node = getByText(/mark/);

    expect(node.parentNode).not.toHaveAttribute('data-testid', '2');
    expect(node.closest('#source')).toBeInTheDocument();
  });

  it('Portal children dismount if the portal dismounts', () => {
    const { queryByText, getByRole } = render(<TestAppBarTabs initialShow />);

    const button = getByRole('button');

    fireEvent.click(button);

    const node = queryByText(/mark/);

    expect(node).not.toBeInTheDocument();
  });

  it('The portal children are not rendered if the source is not rendered', () => {
    const { queryByText } = render(<TestAppBarTabs initialShow={false} />);

    const node = queryByText(/mark/);

    expect(node).not.toBeInTheDocument();
  });
});
