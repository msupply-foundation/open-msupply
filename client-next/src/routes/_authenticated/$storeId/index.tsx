import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from '@/intl';

export const Route = createFileRoute('/_authenticated/$storeId/')({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-xl font-semibold">{t('app.dashboard')}</h1>
      <p className="text-muted-foreground">{t('messages.dashboard-intro')}</p>
    </div>
  );
}
