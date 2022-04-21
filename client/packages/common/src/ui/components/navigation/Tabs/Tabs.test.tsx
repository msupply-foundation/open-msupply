import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { TabList, Tab, TabPanel, TabContext } from './Tabs';
import { useTabs } from './useTabs';

describe('Tabs', () => {
  const ExampleTabs = () => {
    const { currentTab, onChangeTab } = useTabs('0');

    return (
      <TabContext value={currentTab}>
        <TabList value={currentTab} onChange={(_, v) => onChangeTab(v)}>
          <Tab value="0" label="zero" />
          <Tab value="1" label="one" />
        </TabList>
        <TabPanel value="0">
          <span>content1</span>
        </TabPanel>
        <TabPanel value="1">
          <span>content2</span>
        </TabPanel>
      </TabContext>
    );
  };

  it('the content of the non active tab is not in the document initially', () => {
    const { queryByText } = render(<ExampleTabs />);

    const node1 = queryByText(/content1/i);
    const node2 = queryByText(/content2/i);

    expect(node1).toBeInTheDocument();
    expect(node2).not.toBeInTheDocument();
  });

  it('renders the content for the tab for the tab clicked', () => {
    const { queryByText, getByRole } = render(<ExampleTabs />);

    const tabButton = getByRole('tab', { name: /one/i });

    fireEvent.click(tabButton);

    const node1 = queryByText(/content1/i);
    const node2 = queryByText(/content2/i);

    expect(node1).not.toBeInTheDocument();
    expect(node2).toBeInTheDocument();
  });
});
