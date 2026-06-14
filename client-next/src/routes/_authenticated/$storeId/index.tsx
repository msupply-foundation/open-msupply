import { createFileRoute } from '@tanstack/react-router';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@/intl';

export const Route = createFileRoute('/_authenticated/$storeId/')({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h5">{t('app.dashboard')}</Typography>
      <Typography color="text.secondary">{t('messages.dashboard-intro')}</Typography>
    </Stack>
  );
}
