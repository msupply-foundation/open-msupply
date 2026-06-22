import { WrenchIcon } from 'lucide-react';
import { useTranslation, type TxKey } from '@/intl';

/**
 * Stand-in for a not-yet-built page. Skeleton nav routes render this so the
 * whole navigation tree is browsable before each feature lands.
 */
export function PlaceholderPage({ titleKey }: { titleKey: TxKey }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <div className="flex min-h-60 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <WrenchIcon className="size-14 opacity-40" />
        <p>{t('messages.not-implemented')}</p>
      </div>
    </div>
  );
}
