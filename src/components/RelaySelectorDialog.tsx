import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
  Chip
} from '@mui/material';
import type { RelayInfo } from '../types';

export default function RelaySelectorDialog({
  open,
  relays,
  selectedRelayId,
  onClose,
  onSelect
}: {
  open: boolean;
  relays: RelayInfo[];
  selectedRelayId: string;
  onClose: () => void;
  onSelect: (relayId: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Choose a relay</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a preferred relay. Manual selection is saved locally.
        </Typography>
        <List disablePadding sx={{ display: 'grid', gap: 1 }}>
          {relays.map((relay) => (
            <ListItemButton
              key={relay.relayId}
              selected={relay.relayId === selectedRelayId}
              onClick={() => onSelect(relay.relayId)}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box component="span">{relay.relayName}</Box>
                    <Chip size="small" label={relay.isOnline === false ? 'Offline' : 'Online'} />
                  </Stack>
                }
                secondary={`${relay.publicUrl} · ${relay.region} · ${relay.currentRooms ?? 0} rooms · ${relay.currentUsers ?? 0} users`}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
