import { Box, Stack, Typography } from '@mui/material';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import { useTranslation, type TxKey } from '@/intl';

/**
 * Stand-in for a not-yet-built page. Skeleton nav routes render this so the
 * whole navigation tree is browsable before each feature lands.
 */
export function PlaceholderPage({ titleKey }: { titleKey: TxKey }) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Typography variant="h5">{t(titleKey)}</Typography>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          color: 'text.secondary',
          minHeight: 240,
        }}
      >
        <HandymanOutlinedIcon sx={{ fontSize: 56, opacity: 0.4 }} />
        <Typography>{t('messages.not-implemented')}</Typography>
      </Box>
    </Stack>
  );
}
