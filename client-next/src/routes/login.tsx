import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowRightIcon } from 'lucide-react';
import { useSession } from '@/app/session';
import { useLogin } from '@/features/auth/useLogin';
import { serverInfoQueryOptions } from '@/features/server/queries';
import { Environment } from '@/lib/config';
import { MSupplyGuy } from '@/components/MSupplyGuy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsSmallScreen } from '@/hooks/useMediaQuery';
import { useTranslation } from '@/intl';

interface LoginValues {
  username: string;
  password: string;
}

// Only allow internal absolute paths as a post-login target (no open redirects,
// no protocol-relative URLs, no bouncing back to /login).
function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  if (value === '/login' || value.startsWith('/login?')) return undefined;
  return value;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (useSession.getState().isAuthenticated) {
      throw redirect({ href: search.redirect ?? '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isSmallScreen = useIsSmallScreen();
  const { redirect: redirectTo } = Route.useSearch();
  const login = useLogin();

  const schema = z.object({
    username: z.string().min(1, t('error.username-required')),
    password: z.string().min(1, t('error.password-required')),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async values => {
    try {
      await login.mutateAsync(values);
      await navigate({ href: redirectTo ?? '/' });
    } catch {
      // Error surfaced via login.error below.
    }
  });

  return (
    <div className="flex min-h-screen w-full">
      {/* Branding panel — gradient, bottom-left copy. Hidden below sm. */}
      <div
        className="hidden flex-[1_0_50%] flex-col items-start justify-end px-[5%] pb-[7%] text-[#fafafa] sm:flex"
        style={{ backgroundImage: 'var(--gradient-primary)' }}
      >
        <p className="text-3xl leading-tight font-bold whitespace-pre-line md:text-5xl lg:text-6xl">
          {t('login.heading')}
        </p>
        <p className="mt-11 text-sm font-semibold md:text-base lg:text-xl">
          {t('login.body')}
        </p>
      </div>

      {/* Form panel — form centred, server info pinned bottom-right. */}
      <div className="flex min-h-screen flex-[1_0_50%] flex-col bg-drawer">
        <div className="flex grow items-center justify-center p-6">
          <form onSubmit={onSubmit} className="w-80 max-w-full">
            <div className="flex flex-col gap-8">
              <div className="flex justify-center">
                <MSupplyGuy
                  width={isSmallScreen ? 155 : 285}
                  height={isSmallScreen ? 90 : 180}
                />
              </div>
              {login.error ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {login.error.message}
                </p>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor="username">{t('heading.username')}</Label>
                <Input
                  id="username"
                  autoFocus
                  aria-invalid={Boolean(errors.username)}
                  {...register('username')}
                />
                {errors.username ? (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">{t('heading.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={login.isPending}
                >
                  {login.isPending ? t('button.logging-in') : t('button.login')}
                  <ArrowRightIcon />
                </Button>
              </div>
            </div>
          </form>
        </div>
        <ServerInfoFooter />
      </div>
    </div>
  );
}

/** App version + central-server label, bottom-right of the form panel. */
function ServerInfoFooter() {
  const { t } = useTranslation();
  // isCentralServer is served without auth, so it resolves on the login screen.
  const { data } = useQuery(serverInfoQueryOptions());

  return (
    <div className="p-4 text-right text-muted-foreground opacity-60">
      <p className="text-sm">
        <strong>{t('label.app-version')}</strong> {Environment.APP_VERSION}
      </p>
      {data?.isCentralServer ? (
        <p className="text-sm font-bold">{t('label.central-server')}</p>
      ) : null}
    </div>
  );
}
