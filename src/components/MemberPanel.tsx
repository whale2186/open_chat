import { Avatar, Box, Chip, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import type { RoomUser } from '../types';
import { pickAccentColor } from '../utils/colors';

export default function MemberPanel({
  members,
  currentUserId,
  roomId,
  roomMax,
  roomCount,
  onClose
}: {
  members: RoomUser[];
  currentUserId?: string;
  roomId: string;
  roomMax: number;
  roomCount: number;
  onClose?: () => void;
}) {
  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', pt: 1 }}>
        <Box sx={{ width: 44, height: 4, borderRadius: 999, bgcolor: 'divider' }} />
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 1.25 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: 'primary.main' }}>
            <GroupRoundedIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              Participants
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Room {roomId} · {roomCount}/{roomMax}
            </Typography>
          </Box>
          {onClose ? (
            <IconButton onClick={onClose} aria-label="close participants">
              <CloseRoundedIcon />
            </IconButton>
          ) : null}
        </Stack>
      </Box>
      <Divider />
      <List sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1 }}>
        {members.length ? members.map((member) => {
          const me = member.userId === currentUserId;
          const accent = pickAccentColor(member.userId || member.nickname || '');
          return (
            <ListItem
              key={member.userId}
              sx={{
                mb: 0.75,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                bgcolor: 'background.paper'
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: accent, borderRadius: '8px' }}>{(member.nickname || member.userId).slice(0, 1).toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                      {member.nickname || member.userId}
                    </Typography>
                    {me ? <Chip size="small" label="You" /> : null}
                  </Stack>
                }
                secondary={member.transport ? `${member.transport}${member.connected === false ? ' · offline' : ''}` : 'online'}
              />
            </ListItem>
          );
        }) : (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No members yet.
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}
