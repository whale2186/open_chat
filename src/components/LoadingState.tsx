import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

export default function LoadingState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 360 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={1}>
            <Skeleton variant="text" width="55%" />
            <Skeleton variant="rounded" height={56} />
            <Skeleton variant="rounded" height={56} />
            <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 1 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
