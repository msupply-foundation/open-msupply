import React, { FC } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AppBarContentPortal, AppBarContent } from './AppBarContent';
import { TestingProvider, setScreenSize_ONLY_FOR_TESTING } from '@common/utils';


describe('AppBarContent', () => {
  const DESKTOP_WIDTH = 1024; // Above sm breakpoint (601px)
  const MOBILE_WIDTH = 500; // Below sm breakpoint (601px)

  afterEach(() => {
    // Reset screen size to desktop after each test
    setScreenSize_ONLY_FOR_TESTING(DESKTOP_WIDTH);
  });

  const TestAppBarContent: FC<{ initialShow: boolean }> = ({ initialShow }) => {
    const [show, setShow] = React.useState(initialShow);

    return (
      <TestingProvider>
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
      </TestingProvider>
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

    const button = getByRole('button');

    fireEvent.click(button);

    const node = queryByText(/josh/);

    expect(node).not.toBeInTheDocument();
  });

  it('The portal children are not rendered if the source is not rendered', () => {
    const { queryByText } = render(<TestAppBarContent initialShow={false} />);

    const node = queryByText(/josh/);

    expect(node).not.toBeInTheDocument();
  });

  it('Renders mobile container when screen is extra small', () => {
    setScreenSize_ONLY_FOR_TESTING(MOBILE_WIDTH);
    
    const { container } = render(
      <TestingProvider>
        <div data-testid="mobile-wrapper">
          <AppBarContent />
        </div>
      </TestingProvider>
    );

    // Verify that AppBarContent renders a container
    const mobileWrapper = container.querySelector('[data-testid="mobile-wrapper"]');
    expect(mobileWrapper).toBeInTheDocument();
    
    // Verify that the container has a child element (the styled MobileContainer)
    const mobileContainer = mobileWrapper?.firstChild as HTMLElement;
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer.tagName).toBe('DIV');
  });

  it('AppBarContentPortal mounts content into mobile container when screen is extra small', () => {
    setScreenSize_ONLY_FOR_TESTING(MOBILE_WIDTH);
    
    const { getByText } = render(
      <TestingProvider>
        <div id="mobile-source">
          <AppBarContent />
        </div>
        <div data-testid="portal-wrapper">
          <AppBarContentPortal>
            <span>mobile-content</span>
          </AppBarContentPortal>
        </div>
      </TestingProvider>
    );

    const node = getByText(/mobile-content/);

    // Ensure content is mounted inside the mobile-source
    expect(node.closest('#mobile-source')).toBeInTheDocument();
    // Ensure content is not in the portal-wrapper
    expect(node.parentNode).not.toHaveAttribute('data-testid', 'portal-wrapper');
  });
});
