import React from 'react';
import {
  Tooltip,
  Box,
  ListOptions,
  ListOptionValues,
} from '@openmsupply-client/common';

interface TempPref {
  id: string;
  key: string;
}

interface ListPrefsProps {
  currentId: string;
  prefs: TempPref[];
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
  setSelectedPref: (id: string) => void;
}

export const ListPrefs = ({
  currentId,
  prefs,
  scrollRef,
  setSelectedPref,
}: ListPrefsProps) => {
  const value = prefs?.find(({ id }) => id === currentId) ?? null;

  let options: ListOptionValues[] =
    prefs?.map(({ id, key }) => ({
      id,
      value: key,
    })) ?? [];

  return (
    <Tooltip title={value?.key}>
      <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <ListOptions
          currentId={currentId}
          onClick={setSelectedPref}
          options={options}
          scrollRef={scrollRef}
        />
      </Box>
    </Tooltip>
  );
};
