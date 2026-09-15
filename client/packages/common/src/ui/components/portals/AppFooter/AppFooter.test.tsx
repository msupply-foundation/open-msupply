import React, { FC } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AppFooterPortal, AppFooter } from './AppFooter';
import { TestingProvider } from '@common/utils';

describe('AppBarContent', () => {
  const TestAppBarContent: FC<{ initialShow: boolean }> = ({ initialShow }) => {
    const [show, setShow] = React.useState(initialShow);

    return (
      <TestingProvider>
        <button onClick={() => setShow(state => !state)} />
        {show && (
          <div id="source">
            <AppFooter />
          </div>
        )}

        <div data-testid="2">
          <AppFooterPortal
            SessionDetails={<span>josh</span>}
            Content={<span>mark</span>}
          />
        </div>
      </TestingProvider>
    );
  };

  it('Portal children are rendered under the source', () => {
    const { getByText } = render(<TestAppBarContent initialShow />);

    const node = getByText(/josh/);
    const node2 = getByText(/mark/);

    expect(node.parentNode).not.toHaveAttribute('data-testid', '2');
    expect(node.closest('#source')).toBeInTheDocument();
    expect(node2.parentNode).not.toHaveAttribute('data-testid', '2');
    expect(node2.closest('#source')).toBeInTheDocument();
  });

  it('Portal children dismount if the portal dismounts', () => {
    const { queryByText, getByRole } = render(
      <TestAppBarContent initialShow />
    );

    const button = getByRole('button');

    fireEvent.click(button);

    const node = queryByText(/josh/);
    const node2 = queryByText(/mark/);

    expect(node).not.toBeInTheDocument();
    expect(node2).not.toBeInTheDocument();
  });

  it('The portal children are not rendered if the source is not rendered', () => {
    const { queryByText } = render(<TestAppBarContent initialShow={false} />);

    const node = queryByText(/josh/);
    const node2 = queryByText(/mark/);

    expect(node).not.toBeInTheDocument();
    expect(node2).not.toBeInTheDocument();
  });
});
