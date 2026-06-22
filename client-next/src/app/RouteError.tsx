import { useEffect } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { isAuthError } from '@/lib/authError';
import { handleAuthError } from '@/app/tokenRefresh';
import { useTranslation } from '@/intl';
import { Button } from '@/components/ui/button';

/**
 * Router-wide error UI. An auth failure tries a silent refresh (recovering the
 * route in place) and only redirects to login if that fails — instead of
 * dumping the raw GraphQL error to the screen.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const expired = isAuthError(error);

  useEffect(() => {
    if (expired) void handleAuthError();
  }, [expired]);

  if (expired) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">
          {t('messages.restoring-session')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-lg font-semibold">{t('heading.something-wrong')}</h2>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
        {error.message}
      </p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {t('button.reload')}
      </Button>
    </div>
  );
}
