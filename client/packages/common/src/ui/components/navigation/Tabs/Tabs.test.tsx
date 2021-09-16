import React, { useState } from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { Tab } from './Tab';
import { Tabs } from './Tabs';
import { TabPanel } from './TabPanel';

describe('Tabs', () => {
  const ExampleTabs = () => {
    const [currentTab, setCurrentTab] = useState(0);

    return (
      <>
        <Tabs
          value={currentTab}
          onChange={(_, newTab) => setCurrentTab(newTab)}
        >
          <Tab value={0} label="1" />
          <Tab value={1} label="2" />
        </Tabs>
        <TabPanel tab={0} currentTab={currentTab}>
          <span>content1</span>
        </TabPanel>
        <TabPanel tab={1} currentTab={currentTab}>
          <span>content2</span>
        </TabPanel>
      </>
    );
  };

  it('initially renders the content of the first tab', () => {
    const { queryByText } = render(<ExampleTabs />);

    const node1 = queryByText(/content1/i);
    const node2 = queryByText(/content2/i);

    expect(node1).toBeInTheDocument();
    expect(node2).not.toBeInTheDocument();
  });

  it('renders the content for the tab for the tab clicked', () => {
    const { queryByText, getByRole } = render(<ExampleTabs />);

    const tabButton = getByRole('tab', { name: /2/ });

    act(() => {
      userEvent.click(tabButton);
    });

    const node1 = queryByText(/content1/i);
    const node2 = queryByText(/content2/i);

    expect(node1).not.toBeInTheDocument();
    expect(node2).toBeInTheDocument();
  });
});
