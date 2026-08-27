import { useState, useCallback } from 'react';

type TabState = {
  currentTab: string;
  onChangeTab: (newTab: string) => void;
};

export const useTabs = (initialTab: string): TabState => {
  const [currentTab, setCurrentTab] = useState(initialTab);

  const onChangeTab = useCallback((newTab: string) => {
    setCurrentTab(newTab);
  }, []);

  return { currentTab, onChangeTab };
};
