import React from 'react';
import {
  Tooltip,
  Box,
  ListOptions,
  ListOptionValues,
  PreferenceDescriptionNode,
  useTranslation,
  LocaleKey,
} from '@openmsupply-client/common';

interface ListPrefsProps {
  currentKey: string;
  prefs: PreferenceDescriptionNode[];
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
  setSelectedPref: (id: string) => void;
}

export const ListPrefs = ({
  currentKey,
  prefs,
  scrollRef,
  setSelectedPref,
}: ListPrefsProps) => {
  const t = useTranslation();
  const value = prefs?.find(({ key }) => key === currentKey) ?? null;

  const options: ListOptionValues[] =
    prefs?.map(({ key }) => ({
      id: key,
      value: t(`preference.${key}` as LocaleKey),
    })) ?? [];

  return (
    <Tooltip title={value?.key}>
      <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <ListOptions
          currentId={currentKey}
          onClick={setSelectedPref}
          options={options}
          scrollRef={scrollRef}
        />
      </Box>
    </Tooltip>
  );
};
