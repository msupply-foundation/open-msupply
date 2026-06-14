import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, Stack, Typography } from '@mui/material';

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
});

function HomePage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h6">client-next shell — authenticated home</Typography>
      <Button component={Link} to="/stock" variant="contained">
        Go to Stock
      </Button>
    </Stack>
  );
}
