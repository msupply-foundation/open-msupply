import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSession } from '@/app/session';
import { useLogin } from '@/features/auth/useLogin';
import { serverInfoQueryOptions } from '@/features/server/queries';
import { Environment } from '@/lib/config';
import { MSupplyGuy } from '@/components/MSupplyGuy';

// Branding copy lifted from the legacy login (common.json: login.heading/body).
const HEADING = 'Simple.\nPowerful.\nPharmaceutical\nManagement.';
const BODY =
  'Welcome to Open mSupply. Your partner for managing health supply chains and improving medicine availability.';

// Login-screen palette, matching the legacy theme.
const GRADIENT = 'linear-gradient(156deg, #f80 4%, #e63535 96%)';
const FORM_BG = '#f2f2f5';
const INPUT_BORDER = '#e4e4eb';
const LABEL_COLOR = '#8f90a6';
const INPUT_TEXT = '#555770';

// Bordered, rounded, underline-less field — the legacy LoginTextInput look.
const loginFieldSx = {
  '& .MuiInputLabel-root, & .MuiInputLabel-root.Mui-focused': {
    color: LABEL_COLOR,
    paddingLeft: '10px',
  },
  '& .MuiInput-root': {
    backgroundColor: '#fff',
    border: `1px solid ${INPUT_BORDER}`,
    borderRadius: '8px',
    padding: '4px 8px',
    '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
    '&:before, &:after': { display: 'none' },
  },
  '& .MuiInput-input': { color: INPUT_TEXT },
} as const;

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
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
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
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      {/* Branding panel — gradient, bottom-left copy. Hidden below sm. */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flex: '1 0 50%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          backgroundImage: GRADIENT,
          color: '#fafafa',
          padding: '0 5% 7%',
        }}
      >
        <Typography
          sx={{
            fontSize: { sm: '30px', md: '48px', lg: '64px' },
            fontWeight: 'bold',
            lineHeight: 'normal',
            whiteSpace: 'pre-line',
          }}
        >
          {HEADING}
        </Typography>
        <Typography
          sx={{
            mt: '45px',
            fontSize: { sm: '14px', md: '16px', lg: '20px' },
            fontWeight: 600,
          }}
        >
          {BODY}
        </Typography>
      </Box>

      {/* Form panel — form centred, server info pinned bottom-right. */}
      <Box
        sx={{
          flex: '1 0 50%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: FORM_BG,
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 3,
          }}
        >
          <form onSubmit={onSubmit}>
            <Stack spacing={5} sx={{ width: 320, maxWidth: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <MSupplyGuy
                  width={isSmallScreen ? 155 : 285}
                  height={isSmallScreen ? 90 : 180}
                />
              </Box>
              {login.error ? (
                <Alert severity="error">{login.error.message}</Alert>
              ) : null}
              <TextField
                label="Username"
                variant="standard"
                fullWidth
                autoFocus
                focused
                sx={loginFieldSx}
                slotProps={{ input: { disableUnderline: true } }}
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                {...register('username')}
              />
              <TextField
                label="Password"
                type="password"
                variant="standard"
                fullWidth
                focused
                sx={loginFieldSx}
                slotProps={{ input: { disableUnderline: true } }}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  disabled={login.isPending}
                >
                  {login.isPending ? 'Logging in…' : 'Login'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
        <ServerInfoFooter />
      </Box>
    </Box>
  );
}

/** App version + central-server label, bottom-right of the form panel. */
function ServerInfoFooter() {
  // isCentralServer is served without auth, so it resolves on the login screen.
  const { data } = useQuery(serverInfoQueryOptions());

  return (
    <Box
      sx={{
        padding: 2,
        textAlign: 'right',
        color: 'text.secondary',
        opacity: 0.6,
      }}
    >
      <Typography variant="body2">
        <strong>App version:</strong> {Environment.APP_VERSION}
      </Typography>
      {data?.isCentralServer ? (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Central server
        </Typography>
      ) : null}
    </Box>
  );
}
