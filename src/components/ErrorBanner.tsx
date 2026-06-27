import { Alert, Button, Stack } from '@mui/material';

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      action={
        onRetry ? (
          <Stack direction="row" alignItems="center">
            <Button color="error" size="small" onClick={onRetry}>
              Retry
            </Button>
          </Stack>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}
