import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export default function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, maxWidth: 420, textAlign: 'center' }}>
      <Stack spacing={1.5} alignItems="center">
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'action.hover' }} />
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      </Stack>
    </Paper>
  );
}
