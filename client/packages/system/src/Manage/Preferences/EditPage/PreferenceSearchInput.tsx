import React from 'react';
import { Box, TextInput, useTranslation } from '@openmsupply-client/common';

interface PreferenceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const PreferenceSearchInput = ({
  value,
  onChange,
}: PreferenceSearchInputProps) => {
  const t = useTranslation();

  return (
    <Box mb={2}>
      <TextInput
        disabled={false}
        label={t('messages.search')}
        value={value}
        onChange={searchTerm => onChange(searchTerm ?? '')}
      />
    </Box>
  );
};
