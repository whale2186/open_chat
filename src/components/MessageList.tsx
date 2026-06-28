import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Typography
} from '@mui/material';

import type { ChatMessage } from '../types';
import MessageBubble from './MessageBubble';

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  hasMoreHistory?: boolean;
  historyLoading?: boolean;
  onLoadOlder?: () => Promise<void>;
};

export default function MessageList({
  messages,
  currentUserId,
  hasMoreHistory = false,
  historyLoading = false,
  onLoadOlder
}: MessageListProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const contentRef =
    useRef<HTMLDivElement | null>(null);

  const loadingOlderRef = useRef(false);
  const nearBottomRef = useRef(true);

  const previousLastMessageIdRef =
    useRef<string | undefined>(undefined);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
    },
    []
  );

  const loadOlderMessages = useCallback(async () => {
    const container = containerRef.current;

    if (
      !container ||
      !onLoadOlder ||
      !hasMoreHistory ||
      historyLoading ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;

    const previousScrollHeight =
      container.scrollHeight;

    const previousScrollTop =
      container.scrollTop;

    try {
      await onLoadOlder();

      /*
       * Wait until React renders the older messages,
       * then restore the visible position.
       */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const currentContainer =
            containerRef.current;

          if (currentContainer) {
            const addedHeight =
              currentContainer.scrollHeight -
              previousScrollHeight;

            currentContainer.scrollTop =
              previousScrollTop + addedHeight;
          }

          loadingOlderRef.current = false;
        });
      });
    } catch (error) {
      loadingOlderRef.current = false;
      console.error(
        'Unable to load older messages:',
        error
      );
    }
  }, [
    hasMoreHistory,
    historyLoading,
    onLoadOlder
  ]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    nearBottomRef.current =
      distanceFromBottom <= 120;

    if (
      container.scrollTop <= 80 &&
      hasMoreHistory &&
      !historyLoading &&
      !loadingOlderRef.current
    ) {
      void loadOlderMessages();
    }
  }, [
    hasMoreHistory,
    historyLoading,
    loadOlderMessages
  ]);

  const lastMessage =
    messages[messages.length - 1];

  const lastMessageId =
    lastMessage?.id;

  /*
   * Handles initial loading and newly appended messages.
   *
   * Prepending old messages does not change the last message ID,
   * so loading history will not jump to the bottom.
   */
  useLayoutEffect(() => {
    if (!lastMessageId) {
      previousLastMessageIdRef.current =
        undefined;

      return;
    }

    const previousLastMessageId =
      previousLastMessageIdRef.current;

    const isInitialLoad =
      previousLastMessageId === undefined;

    const isNewLastMessage =
      previousLastMessageId !== undefined &&
      previousLastMessageId !== lastMessageId;

    const isOwnMessage =
      lastMessage.senderId === currentUserId;

    if (
      isInitialLoad ||
      (isNewLastMessage &&
        (nearBottomRef.current || isOwnMessage))
    ) {
      scrollToBottom(
        isInitialLoad ? 'auto' : 'smooth'
      );

      nearBottomRef.current = true;
    }

    previousLastMessageIdRef.current =
      lastMessageId;
  }, [
    currentUserId,
    lastMessageId,
    lastMessage?.senderId,
    scrollToBottom
  ]);

  /*
   * Keeps the panel pinned when an image, attachment,
   * link preview or message bubble changes height.
   */
  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (
        nearBottomRef.current &&
        !loadingOlderRef.current
      ) {
        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
      }
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [scrollToBottom]);

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'contain',
        overflowAnchor: 'none',
        scrollbarGutter: 'stable',
        bgcolor: 'transparent',
        px: { xs: 1, sm: 1.5 },
        pt: { xs: 1, sm: 1.5 },
        pb: {
          xs: 'calc(104px + env(safe-area-inset-bottom))',
          sm: 12
        }
      }}
    >
      <Stack
        ref={contentRef}
        spacing={1}
        sx={{
          minHeight: '100%'
        }}
      >
        {historyLoading && hasMoreHistory ? (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{
              py: 1,
              flexShrink: 0
            }}
          >
            <CircularProgress size={16} />

            <Typography
              variant="caption"
              color="text.secondary"
            >
              Loading older messages…
            </Typography>
          </Stack>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={
              message.direction === 'outgoing' || message.senderId === currentUserId
            }
          />
        ))}

        <Box
          aria-hidden
          sx={{
            height: 4,
            flexShrink: 0
          }}
        />
      </Stack>
    </Box>
  );
}
