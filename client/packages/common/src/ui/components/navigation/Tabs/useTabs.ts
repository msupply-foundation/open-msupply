import { useState, useCallback } from 'react';

type TabState = {
  currentTab: string;
  onChangeTab: (event: React.SyntheticEvent, newTab: string) => void;
};

export const useTabs = (initialTab: string): TabState => {
  const [currentTab, setCurrentTab] = useState(initialTab);

  const onChangeTab = useCallback((_, newTab: string) => {
    setCurrentTab(newTab);
  }, []);

  return { currentTab, onChangeTab };
};
