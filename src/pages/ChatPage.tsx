import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box
} from '@mui/material';
import { useSession } from '../state/SessionContext';
import { useSettings } from '../state/SettingsContext';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import MemberPanel from '../components/MemberPanel';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorBanner from '../components/ErrorBanner';

export default function ChatPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { session, messages, members, sendMessage, retryConnection, selectedRoomId, setSelectedRoomId } = useSession();
  const { settings } = useSettings();
  const roomId = params.roomId || selectedRoomId || session?.roomId || '';
  const chatBackgroundImage = settings.chatBackgroundImage.startsWith('data:image/')
    ? settings.chatBackgroundImage
    : '';

  useEffect(() => {
    if (params.roomId && params.roomId !== selectedRoomId) {
      setSelectedRoomId(params.roomId);
    }
  }, [params.roomId, selectedRoomId, setSelectedRoomId]);

  const memberDrawer = (
    <MemberPanel
      members={members}
      currentUserId={session?.userId}
      roomId={roomId}
      roomMax={session?.room?.maxUsers ?? 2}
      roomCount={session?.room?.memberCount ?? members.length}
    />
  );

  if (!session || !roomId) {
    return (
      <Box sx={{ minHeight: '100%', display: 'grid', placeItems: 'center', p: 2 }}>
        <EmptyState
          title="No active room"
          subtitle="Join or create a room from the home screen."
          actionLabel="Go home"
          onAction={() => navigate('/')}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 280px' },
        gap: { xs: 0, sm: 1.5 },
        p: { xs: 0, sm: 0 },
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: { xs: 0, sm: '1px solid' },
          borderColor: 'divider',
          borderRadius: { xs: 0, sm: '8px' },
          bgcolor: 'background.paper'
        }}
      >
        {session.error ? (
          <Box sx={{ flexShrink: 0, px: { xs: 1, sm: 1.5 }, pt: 1 }}>
            <ErrorBanner message={session.error} onRetry={retryConnection} />
          </Box>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.default',
            backgroundImage: chatBackgroundImage
              ? `linear-gradient(rgba(8, 13, 20, 0.24), rgba(8, 13, 20, 0.24)), url(${JSON.stringify(chatBackgroundImage)})`
              : undefined,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        >
          {!messages.length ? (
            <LoadingState title="Preparing conversation" subtitle="Your messages will appear here." />
          ) : (
            <MessageList messages={messages} currentUserId={session.userId} />
          )}

          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
              display: 'grid',
              gap: 1,
              p: { xs: 1, sm: 1.5 },
              pb: { xs: 'calc(10px + env(safe-area-inset-bottom))', sm: 1.5 },
              pointerEvents: 'none'
            }}
          >
            {session.connectionStatus !== 'connected' ? (
              <Alert
                severity="info"
                variant="outlined"
                sx={{
                  alignItems: 'center',
                  pointerEvents: 'auto',
                  bgcolor: 'background.paper',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)'
                }}
              >
                {session.connectionStatus === 'connecting' || session.connectionStatus === 'preparing'
                  ? 'Connecting to the room…'
                  : 'You are not connected right now.'}
              </Alert>
            ) : null}

            <Box sx={{ pointerEvents: 'auto' }}>
              <MessageComposer disabled={session.connectionStatus !== 'connected'} onSend={sendMessage} currentNickname={settings.nickname} />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          display: { xs: 'none', md: 'block' },
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          bgcolor: 'background.paper'
        }}
      >
        {memberDrawer}
      </Box>
    </Box>
  );
}
