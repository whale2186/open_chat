import { Chip } from '@mui/material';
import type { ConnectionStatus } from '../types';

function label(status: ConnectionStatus): string {
  if (status === 'connecting' || status === 'preparing') return 'Connecting';
  if (status === 'reconnecting') return 'Reconnecting';
  if (status === 'offline') return 'Offline';
  if (status === 'error') return 'Error';
  if (status === 'connected') return 'Connected';
  return 'Idle';
}

export default function ConnectionStatusChip({ status }: { status: ConnectionStatus }) {
  const color = status === 'error' || status === 'offline' ? 'default' : 'primary';
  return <Chip size="small" label={label(status)} color={color} variant="outlined" />;
}
