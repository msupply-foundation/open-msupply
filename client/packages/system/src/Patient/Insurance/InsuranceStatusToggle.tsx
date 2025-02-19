import React, { FC, ReactElement } from 'react';
import { Checkbox, Typography } from '@common/components';
import { useTranslation } from '@common/intl';

import { Box } from '@openmsupply-client/common';

interface InsuranceStatusToggleProps {
  isActive: boolean;
  onChange: (isActive: boolean) => void;
}

export const InsuranceStatusToggle: FC<InsuranceStatusToggleProps> = ({
  isActive,
  onChange,
}): ReactElement => {
  const t = useTranslation();
  return (
    <Box pt={2}>
      <Typography variant="body1">{t('label.is-active-insurance')}</Typography>
      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'row' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Checkbox checked={isActive} onChange={() => onChange(true)} />
          <Typography variant="body1">{t('label.active')}</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Checkbox checked={!isActive} onChange={() => onChange(false)} />
          <Typography variant="body1">{t('label.inactive')}</Typography>
        </Box>
      </Box>
    </Box>
  );
};
