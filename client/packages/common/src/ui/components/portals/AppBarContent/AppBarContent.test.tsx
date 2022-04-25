import React, { FC } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AppBarContentPortal, AppBarContent } from './AppBarContent';

describe('AppBarContent', () => {
  const TestAppBarContent: FC<{ initialShow: boolean }> = ({ initialShow }) => {
    const [show, setShow] = React.useState(initialShow);

    return (
      <>
        <button onClick={() => setShow(state => !state)} />
        {show && (
          <div id="source">
            <AppBarContent />
          </div>
        )}

        <div data-testid="2">
          <AppBarContentPortal>
            <span>josh</span>
          </AppBarContentPortal>
        </div>
      </>
    );
  };

  it('Portal children are rendered under the source', () => {
    const { getByText } = render(<TestAppBarContent initialShow />);

    const node = getByText(/josh/);

    expect(node.parentNode).not.toHaveAttribute('data-testid', '2');
    expect(node.closest('#source')).toBeInTheDocument();
  });

  it('Portal children dismount if the portal dismounts', () => {
    const { queryByText, getByRole } = render(
      <TestAppBarContent initialShow />
    );

    const button = getByRole(/button/);

    fireEvent.click(button);

    const node = queryByText(/josh/);

    expect(node).not.toBeInTheDocument();
  });

  it('The portal children are not rendered if the source is not rendered', () => {
    const { queryByText } = render(<TestAppBarContent initialShow={false} />);

    const node = queryByText(/josh/);

    expect(node).not.toBeInTheDocument();
  });
});
