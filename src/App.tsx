import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import { useSettings } from './state/SettingsContext';
import { useSession } from './state/SessionContext';
import { useRooms } from './state/RoomsContext';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import SettingsDrawer from './components/SettingsDrawer';
import MemberPanel from './components/MemberPanel';
import ConnectionStatusChip from './components/ConnectionStatusChip';
import { cyanThemeOptions, darkThemeOptions } from './app/theme';
import { ThemeMode } from './types';

export default function App() {
  const {
    settings,
    updateSettings,
    setThemeMode,
    settingsOpen,
    setSettingsOpen
  } = useSettings();

  const { session, members, leaveRoom } = useSession();
  const { togglePinned, getSavedRoom } = useRooms();

  const location = useLocation();
  const navigate = useNavigate();

  const [membersOpen, setMembersOpen] = useState(false);
  const [copiedOpen, setCopiedOpen] = useState(false);

  const isRoomRoute = location.pathname.startsWith('/room/');
  const isDesktop = useMediaQuery('(min-width:900px)');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const mode = settings.themeMode || (prefersDark ? 'dark' : 'light');

  const routeRoomId = isRoomRoute
    ? decodeURIComponent(location.pathname.slice('/room/'.length).split('/')[0] || '')
    : '';

  const roomId = session?.roomId || routeRoomId;
  const savedRoom = roomId ? getSavedRoom(roomId) : undefined;
  const isSaved = Boolean(savedRoom?.pinned);
  const roomDisplayName = savedRoom?.label && savedRoom.label !== roomId ? savedRoom.label : roomId;
  const roomCount = session?.room?.memberCount ?? members.length;
  const roomMax = session?.room?.maxUsers ?? 2;

  const theme = useMemo(() => {
    const baseOptions = mode === 'dark' ? darkThemeOptions : cyanThemeOptions;
    const accentColor = /^#[0-9a-fA-F]{6}$/.test(settings.accentColor)
      ? settings.accentColor
      : '#26c6da';
    const base = createTheme({
      ...baseOptions,
      palette: {
        ...baseOptions.palette,
        primary: { main: accentColor },
        secondary: { main: accentColor }
      }
    });

    return responsiveFontSizes(base);
  }, [mode, settings.accentColor]);

  const handleLeaveRoom = () => {
    leaveRoom();
    setMembersOpen(false);
    navigate('/');
  };

  const copyRoomId = async () => {
    if (!roomId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(roomId);
    } finally {
      setCopiedOpen(true);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          height: '100dvh',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}
      >
        <AppBar
          elevation={0}
          color="transparent"
          position="static"
          sx={{
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(6px)',
            bgcolor: 'background.paper'
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 60 }, px: { xs: 1, sm: 1.5 }, gap: 1 }}>
            {isRoomRoute ? (
              <Tooltip title="Leave room">
                <IconButton
                  edge="start"
                  onClick={handleLeaveRoom}
                  aria-label="leave room and go home"
                  size="small"
                >
                  <HomeRoundedIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <HomeRoundedIcon color="primary" />
            )}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ minWidth: 0 }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  noWrap
                  sx={{ minWidth: 0, fontSize: { xs: '0.95rem', sm: '1rem' } }}
                >
                  {isRoomRoute && roomId ? roomDisplayName : 'Open Chat'}
                </Typography>

                {isRoomRoute && session ? (
                  <Box sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
                    <ConnectionStatusChip status={session.connectionStatus} />
                  </Box>
                ) : null}
              </Stack>

              <Typography variant="caption" color="text.secondary" noWrap>
                {isRoomRoute
                  ? session
                    ? `${savedRoom?.label && savedRoom.label !== roomId ? `${roomId} - ` : ''}${roomCount}/${roomMax} members${session.offlineMessagesEnabled ? ' - offline messages' : ''}`
                    : ''
                  : ''}
              </Typography>
            </Box>

            {isRoomRoute && roomId ? (
              <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Tooltip title="Copy room code">
                  <IconButton onClick={copyRoomId} aria-label="copy room code" size="small">
                    <ContentCopyRoundedIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={`${roomCount} members`}>
                  <IconButton
                    onClick={() => setMembersOpen(true)}
                    aria-label="show room members"
                    size="small"
                    sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  >
                    <GroupRoundedIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title={isSaved ? 'Unpin room' : 'Pin room'}>
                  <IconButton
                    onClick={() => togglePinned(roomId)}
                    aria-label={isSaved ? 'unpin room' : 'pin room'}
                    size="small"
                  >
                    {isSaved ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : null}

            <Tooltip title={mode === 'dark' ? 'Use light theme' : 'Use dark theme'}>
              <IconButton
                onClick={() =>
                  setThemeMode(mode === 'dark' ? 'light' : 'dark')
                }
                aria-label="toggle theme"
                size="small"
              >
                {mode === 'dark' ? (
                  <LightModeOutlinedIcon />
                ) : (
                  <DarkModeOutlinedIcon />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                aria-label="open settings"
                size="small"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

          </Toolbar>
        </AppBar>

        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            px: { xs: 0, sm: 2, md: 3 },
            py: { xs: 0, sm: 2 },
            overflow: isRoomRoute ? 'hidden' : 'auto'
          }}
        >
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>

        <Drawer
          anchor={isDesktop ? 'right' : 'bottom'}
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: isDesktop ? 360 : '100%',
              height: isDesktop ? '100%' : '74vh',
              maxHeight: isDesktop ? '100%' : 'calc(100dvh - 72px)',
              borderTopLeftRadius: isDesktop ? 0 : 16,
              borderTopRightRadius: isDesktop ? 0 : 16,
              overflow: 'hidden'
            }
          }}
        >
          <MemberPanel
            members={members}
            currentUserId={session?.userId}
            roomId={roomId}
            roomMax={roomMax}
            roomCount={roomCount}
            onClose={() => setMembersOpen(false)}
          />
        </Drawer>

        <Snackbar
          open={copiedOpen}
          autoHideDuration={1600}
          onClose={() => setCopiedOpen(false)}
          message="Room code copied"
        />

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
          mode={mode as ThemeMode}
        />
      </Box>
    </ThemeProvider>
  );
}
