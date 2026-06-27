import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import type { ChatSession } from '../types';
import ConnectionStatusChip from './ConnectionStatusChip';

export default function RoomHeader({
  session,
  onMembersOpen,
  onCopyRoomId,
  onToggleSaved,
  isSaved
}: {
  session: ChatSession;
  onMembersOpen: () => void;
  onCopyRoomId: () => void;
  onToggleSaved: () => void;
  isSaved: boolean;
}) {
  return (
    <Box
      sx={{
        px: { xs: 1, sm: 1.5 },
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
        minWidth: 0
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          noWrap
          sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}
        >
          Room {session.roomId}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          sx={{ mt: 0.25 }}
        >
          <ConnectionStatusChip status={session.connectionStatus} />
          <Chip size="small" label={`${session.room?.memberCount ?? session.members.length} members`} />
        </Stack>
      </Box>
      <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
      <Tooltip title="Copy room code">
        <IconButton onClick={onCopyRoomId} aria-label="copy room code" size="small">
          <ContentCopyRoundedIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title={isSaved ? 'Unsave room' : 'Save room'}>
        <IconButton onClick={onToggleSaved} aria-label="save room" size="small">
          {isSaved ? <StarRoundedIcon color="primary" /> : <StarBorderRoundedIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Participants">
        <IconButton onClick={onMembersOpen} aria-label="members" size="small">
          <GroupRoundedIcon />
        </IconButton>
      </Tooltip>
      </Stack>
    </Box>
  );
}
