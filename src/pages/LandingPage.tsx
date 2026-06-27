import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useSettings } from '../state/SettingsContext';
import { useRooms } from '../state/RoomsContext';
import { useSession } from '../state/SessionContext';
import { requireNickname, requireRoomId } from '../utils/validators';

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '8px',
  minWidth: 0
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { savedRooms, saveRoom, removeRoom, togglePinned, updateRoomLabel } = useRooms();
  const { createAndEnterRoom, joinAndEnterRoom } = useSession();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPin, setJoinPin] = useState('');
  const [joinNickname, setJoinNickname] = useState(settings.nickname);
  const [createRoomId, setCreateRoomId] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [createNickname, setCreateNickname] = useState(settings.nickname);
  const [createMaxUsers, setCreateMaxUsers] = useState<string>('2');
  const [editingRoomId, setEditingRoomId] = useState('');
  const [editingRoomName, setEditingRoomName] = useState('');
  const [loading, setLoading] = useState<'join' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pinnedRooms = useMemo(() => savedRooms.filter((room) => room.pinned), [savedRooms]);

  const copyRoomId = async (roomId: string) => {
    try {
      await navigator.clipboard.writeText(roomId);
      setError(null);
    } catch {
      setError('Copy failed. Please copy the room code manually.');
    }
  };

  const submitJoin = async () => {
    const roomError = requireRoomId(joinRoomId);
    const nickError = requireNickname(joinNickname);

    if (roomError || nickError) {
      setError(roomError || nickError);
      return;
    }

    setLoading('join');
    setError(null);
    updateSettings({ nickname: joinNickname.trim() });

    try {
      const result = await joinAndEnterRoom({
        mode: 'join',
        roomId: joinRoomId.trim(),
        nickname: joinNickname.trim(),
        pin: joinPin.trim() || undefined
      });

      saveRoom({
        roomId: result.roomId,
        nickname: result.nickname,
        relay: result.relay
      });
      navigate(`/room/${result.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join room.');
    } finally {
      setLoading(null);
    }
  };

  const submitCreate = async () => {
    const nickError = requireNickname(createNickname);

    if (nickError) {
      setError(nickError);
      return;
    }

    setLoading('create');
    setError(null);
    updateSettings({ nickname: createNickname.trim() });

    try {
      const result = await createAndEnterRoom({
        mode: 'create',
        roomId: createRoomId.trim() || undefined,
        nickname: createNickname.trim(),
        pin: createPin.trim() || undefined,
        maxUsers: Math.min(9999, Math.max(2, Number(createMaxUsers) || 2))
      });

      saveRoom({
        roomId: result.roomId,
        nickname: result.nickname,
        relay: result.relay,
        label: createRoomName.trim() || undefined
      });
      navigate(`/room/${result.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create room.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'grid',
        gap: 2,
        p: { xs: 1, sm: 0 },
        alignContent: 'start'
      }}
    >
      {error ? <Alert severity="error" variant="outlined">{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
          gap: 2,
          alignItems: 'start'
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
            minWidth: 0
          }}
        >
          <Card sx={{ ...cardSx, height: '100%' }}>
            <CardContent sx={{ display: 'grid', gap: 1.5, height: '100%', p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LoginRoundedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Join room
                </Typography>
              </Stack>

              <TextField label="Room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} />
              <TextField label="Nickname" value={joinNickname} onChange={(e) => setJoinNickname(e.target.value)} />
              <TextField label="PIN (optional)" value={joinPin} onChange={(e) => setJoinPin(e.target.value)} type="password" />

              <Button
                variant="contained"
                size="large"
                startIcon={<MeetingRoomRoundedIcon />}
                onClick={submitJoin}
                disabled={loading === 'join'}
                sx={{ mt: 'auto' }}
              >
                Join room
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ ...cardSx, height: '100%' }}>
            <CardContent sx={{ display: 'grid', gap: 1.5, height: '100%', p: { xs: 1.5, sm: 2 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GroupAddRoundedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={800}>
                  Create room
                </Typography>
              </Stack>

              <TextField
                label="Room ID (optional)"
                value={createRoomId}
                onChange={(e) => setCreateRoomId(e.target.value)}
                helperText="Leave blank for a generated room ID."
              />
              <TextField label="Room name (optional)" value={createRoomName} onChange={(e) => setCreateRoomName(e.target.value)} />
              <TextField label="Nickname" value={createNickname} onChange={(e) => setCreateNickname(e.target.value)} />
              <TextField label="PIN (optional)" value={createPin} onChange={(e) => setCreatePin(e.target.value)} type="password" />
              <TextField
                label="Max users"
                type="number"
                value={createMaxUsers}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === '') {
                    setCreateMaxUsers('');
                    return;
                  }

                  if (Number(value) <= 9999) {
                    setCreateMaxUsers(value);
                  }
                }}
                inputProps={{ min: 2, max: 9999 }}
              />

              <Button
                variant="contained"
                size="large"
                startIcon={<GroupAddRoundedIcon />}
                onClick={submitCreate}
                disabled={loading === 'create'}
                sx={{ mt: 'auto' }}
              >
                Create room
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Card sx={cardSx}>
          <CardContent sx={{ display: 'grid', gap: 1.25, p: { xs: 1.5, sm: 2 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight={800}>
                Pinned rooms
              </Typography>
              <Chip size="small" label={`${pinnedRooms.length}`} />
            </Stack>

            {pinnedRooms.length ? (
              <List disablePadding sx={{ display: 'grid', gap: 1 }}>
                {pinnedRooms.map((room) => {
                  const editing = editingRoomId === room.roomId;

                  return (
                    <ListItemButton
                      key={room.roomId}
                      onClick={() => {
                        if (editing) {
                          return;
                        }

                        setJoinRoomId(room.roomId);
                        setJoinNickname(room.nickname || settings.nickname);
                        setJoinPin('');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: editing ? '32px minmax(0, 1fr)' : '32px minmax(0, 1fr) auto',
                        gap: 1,
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '8px',
                        px: 1,
                        py: 1,
                        minWidth: 0
                      }}
                    >
                      <StarRoundedIcon color="primary" fontSize="small" />
                      {editing ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                          <TextField
                            label="Room name"
                            value={editingRoomName}
                            onChange={(event) => setEditingRoomName(event.target.value)}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                updateRoomLabel(room.roomId, editingRoomName);
                                setEditingRoomId('');
                              }

                              if (event.key === 'Escape') {
                                setEditingRoomId('');
                              }
                            }}
                            size="small"
                          />
                          <Tooltip title="Save name">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateRoomLabel(room.roomId, editingRoomName);
                                setEditingRoomId('');
                              }}
                            >
                              <CheckRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingRoomId('');
                              }}
                            >
                              <CloseRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <>
                          <ListItemText
                            primary={room.label || room.roomId}
                            secondary={room.relayName ? `${room.roomId} - ${room.relayName}` : room.roomId}
                            primaryTypographyProps={{ noWrap: true, fontWeight: 700 }}
                            secondaryTypographyProps={{ noWrap: true }}
                            sx={{ minWidth: 0, m: 0 }}
                          />
                          <Stack direction="row" spacing={0.25}>
                            <Tooltip title="Rename room">
                              <IconButton
                                size="small"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingRoomId(room.roomId);
                                  setEditingRoomName(room.label === room.roomId ? '' : room.label);
                                }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Copy room code">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); copyRoomId(room.roomId); }}>
                                <ContentCopyRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Unpin room">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); togglePinned(room.roomId); }}>
                                <StarRoundedIcon fontSize="small" color="primary" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove room">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeRoom(room.roomId); }}>
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </>
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Pin a room from the chat header to keep it here.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
