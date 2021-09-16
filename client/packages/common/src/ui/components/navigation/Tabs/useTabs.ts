import { useState, useCallback } from 'react';

type TabState = {
  currentTab: number;
  onChangeTab: (event: React.SyntheticEvent, newTab: number) => void;
};

export const useTabs = (initialTab = 0): TabState => {
  const [currentTab, setCurrentTab] = useState(initialTab);

  const onChangeTab = useCallback((_, newTab: number) => {
    setCurrentTab(newTab);
  }, []);

  return { currentTab, onChangeTab };
};
