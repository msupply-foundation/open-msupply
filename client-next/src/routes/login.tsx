import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSession } from '@/app/session';
import { useLogin } from '@/features/auth/useLogin';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

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
  const { redirect: redirectTo } = Route.useSearch();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async values => {
    try {
      await login.mutateAsync(values);
      await navigate({ href: redirectTo ?? '/' });
    } catch {
      // Error surfaced via login.error below.
    }
  });

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ p: 4, width: 360 }} elevation={3}>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Typography variant="h5">open mSupply</Typography>
            {login.error ? (
              <Alert severity="error">{login.error.message}</Alert>
            ) : null}
            <TextField
              label="Username"
              autoFocus
              error={Boolean(errors.username)}
              helperText={errors.username?.message}
              {...register('username')}
            />
            <TextField
              label="Password"
              type="password"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" variant="contained" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
