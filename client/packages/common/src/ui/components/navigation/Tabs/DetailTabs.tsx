import React, { FC, ReactNode, useState, useEffect, useCallback } from 'react';
import TabContext from '@mui/lab/TabContext';
import { Box } from '@mui/material';
import {
  useConfirmOnLeaving,
  UrlQueryObject,
  UrlQuerySort,
  useDetailPanelStore,
  useDrawer,
} from '@common/hooks';
import { LocaleKey, useTranslation } from '@common/intl';
import { AppBarTabsPortal } from '../../portals';
import { DetailTab } from './DetailTab';
import { ShortTabList, Tab } from './Tabs';
import { useUrlQuery } from '@common/hooks';

export type TabDefinition = {
  Component: ReactNode;
  value: string;
  confirmOnLeaving?: boolean;
  sort?: UrlQuerySort;
};
interface DetailTabsProps {
  tabs: TabDefinition[];
  requiresConfirmation?: (tab: string) => boolean;
}

export const DetailTabs: FC<DetailTabsProps> = ({
  tabs,
  requiresConfirmation = () => false,
}) => {
  const isValidTab = useCallback(
    (tab?: string): tab is string =>
      !!tab && tabs.some(({ value }) => value === tab),
    [tabs]
  );

  const { urlQuery, updateQuery } = useUrlQuery();
  const t = useTranslation();
  const currentUrlTab = urlQuery['tab'] as string | undefined;
  const currentTab = isValidTab(currentUrlTab)
    ? currentUrlTab
    : tabs[0]?.value ?? '';
  const { showConfirmation } = useConfirmOnLeaving(false);

  // Inelegant hack to force the "Underline" indicator for the currently active
  // tab to re-render in the correct position when one of the side "drawers" is
  // expanded. See issue #777 for more detail.
  const { isOpen: detailPanelOpen } = useDetailPanelStore();
  const { isOpen: drawerOpen } = useDrawer();
  // const handleResize = useCallback(() => {
  //   window.dispatchEvent(new Event('resize'));
  // }, []);
  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, [detailPanelOpen, drawerOpen]);

  const [tabQueryParams, setTabQueryParams] = useState<
    Record<string, UrlQueryObject>
  >({});

  const getDefaultTabQueryParams = (tab: string): UrlQueryObject => {
    const tabDefinition = tabs.find(({ value }) => value === tab);
    const sort = tabDefinition?.sort;
    const query: UrlQueryObject = sort
      ? { tab, sort: sort.key, dir: sort.dir }
      : { tab };
    return query;
  };

  const onChange = (_: React.SyntheticEvent, tab: string) => {
    const tabConfirm = tabs.find(({ value }) => value === currentTab);
    // restore the query params for the tab
    const query: UrlQueryObject =
      tabQueryParams[tab] ?? getDefaultTabQueryParams(tab);

    if (!!tabConfirm?.confirmOnLeaving && requiresConfirmation(currentTab)) {
      showConfirmation(() => updateQuery(query, true));
    } else {
      updateQuery(query, true);
    }
  };

  useEffect(() => {
    const tab = urlQuery['tab'] as string | undefined;
    if (isValidTab(tab)) {
      // store the query params for the current tab
      setTabQueryParams(value => {
        return {
          ...value,
          [tab]: urlQuery,
        };
      });
    }
  }, [isValidTab, urlQuery]);

  return (
    <TabContext value={currentTab}>
      <AppBarTabsPortal
        sx={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <Box flex={1}>
          <ShortTabList value={currentTab} centered onChange={onChange}>
            {tabs.map(({ value }, index) => (
              <Tab
                key={value}
                value={value}
                label={t(`label.${value.toLowerCase()}` as LocaleKey, {
                  defaultValue: value,
                })}
                tabIndex={index === 0 ? -1 : undefined}
              ></Tab>
            ))}
          </ShortTabList>
        </Box>
      </AppBarTabsPortal>
      {tabs.map(({ Component, value }) => (
        <DetailTab value={value} key={value}>
          {Component}
        </DetailTab>
      ))}
    </TabContext>
  );
};
