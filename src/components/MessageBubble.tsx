import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Avatar, Box, Dialog, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import BrokenImageRoundedIcon from '@mui/icons-material/BrokenImageRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import type { ChatMessage } from '../types';
import { alphaHex, pickAccentColor } from '../utils/colors';
import { formatClock } from '../utils/time';

type ViewerMedia = {
  type: 'image' | 'video' | 'pdf';
  src: string;
};

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
  'text/plain': 'txt'
};

function fileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const name = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return name || parsed.hostname || 'file';
  } catch {
    return 'file';
  }
}

function linkLabelFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') || 'Open link';
  } catch {
    return 'Open link';
  }
}

function extensionFromMime(mime: string) {
  return MIME_EXTENSIONS[mime] || mime.split('/').pop()?.replace(/[^a-z0-9]/gi, '') || 'file';
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadSource(src: string, fileName: string) {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    triggerDownload(src, fileName);
    return;
  }

  try {
    const response = await fetch(src);

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    triggerDownload(src, fileName);
  }
}

export default function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const [viewerMedia, setViewerMedia] = useState<ViewerMedia | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageGrabbing, setImageGrabbing] = useState(false);
  const inlineVideoRef = useRef<HTMLVideoElement | null>(null);
  const imagePanRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  });
  const accent = pickAccentColor(message.colorKey || message.senderId || message.senderNickname);
  const text = message.text.trim();
  const dataMatch = text.match(/^data:([^;,]+)(?:;[^,]*)?,/i);
  const dataMime = dataMatch?.[1]?.toLowerCase() || '';
  const isDataFile = Boolean(dataMime);
  const isDataImage = dataMime.startsWith('image/');
  const isDataVideo = dataMime.startsWith('video/');
  const isDataPdf = dataMime === 'application/pdf';
  const isURL = /^https?:\/\/[^\s]+$/i.test(text);
  const isURLImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg|avif)(\?.*)?$/i.test(text);
  const isURLVideo = /\.(mp4|webm|ogg|mov|avi|mkv|wmv|flv|m4v)(\?.*)?$/i.test(text);
  const isURLPdf = /\.pdf(\?.*)?$/i.test(text);
  const isURLGenericFile = isURL && !isURLImage && !isURLVideo && !isURLPdf && /\.[a-z0-9]{1,8}(\?.*)?$/i.test(text);
  const mediaType = isDataImage || (isURL && isURLImage)
    ? 'image'
    : isDataVideo || (isURL && isURLVideo)
      ? 'video'
      : isDataPdf || (isURL && isURLPdf)
        ? 'pdf'
        : null;
  const isGenericFile = (isDataFile && !mediaType) || isURLGenericFile;
  const fileName = isURL
    ? fileNameFromUrl(text)
    : `attachment.${extensionFromMime(dataMime || 'application/octet-stream')}`;
  const linkLabel = isURL ? linkLabelFromUrl(text) : '';

  useEffect(() => {
    setMediaFailed(false);
  }, [text]);

  useEffect(() => {
    setImageZoom(1);
    setImageOffset({ x: 0, y: 0 });
    setImageGrabbing(false);
  }, [viewerMedia]);

  if (message.direction === 'system') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', px: 1, py: 0.25 }}>
        <Paper
          variant="outlined"
          sx={{
            px: 1.25,
            py: 0.75,
            borderRadius: '8px',
            bgcolor: 'background.paper',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          <Typography variant="caption" color={message.systemKind === 'error' ? 'error.main' : 'text.secondary'}>
            {message.text}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const openViewer = () => {
    if (mediaType) {
      inlineVideoRef.current?.pause();
      setViewerMedia({ type: mediaType, src: text });
    }
  };

  const openFile = () => {
    window.open(text, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = async () => {
    await downloadSource(text, fileName);
  };

  const setViewerZoom = (nextZoom: number) => {
    const zoom = Math.min(4, Math.max(0.5, Number(nextZoom.toFixed(2))));
    setImageZoom(zoom);

    if (zoom <= 1) {
      setImageOffset({ x: 0, y: 0 });
    }
  };

  const zoomImageIn = () => {
    setViewerZoom(imageZoom === 1 ? 2 : imageZoom + 0.5);
  };

  const startImagePan = (event: PointerEvent<HTMLElement>) => {
    if (viewerMedia?.type !== 'image' || imageZoom <= 1) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    imagePanRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: imageOffset.x,
      originY: imageOffset.y
    };
    setImageGrabbing(true);
  };

  const moveImagePan = (event: PointerEvent<HTMLElement>) => {
    if (!imagePanRef.current.active) {
      return;
    }

    const deltaX = event.clientX - imagePanRef.current.startX;
    const deltaY = event.clientY - imagePanRef.current.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      imagePanRef.current.moved = true;
    }

    setImageOffset({
      x: imagePanRef.current.originX + deltaX,
      y: imagePanRef.current.originY + deltaY
    });
  };

  const stopImagePan = (event: PointerEvent<HTMLElement>) => {
    if (!imagePanRef.current.active) {
      return;
    }

    imagePanRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setImageGrabbing(false);
  };

  const fileActions = (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.75 }}>
      <Tooltip title="Open file">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            mediaType && !mediaFailed ? openViewer() : openFile();
          }}
          aria-label="open file"
          sx={{ width: 30, height: 30, borderRadius: '50%' }}
        >
          <OpenInNewRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download file">
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            void downloadFile();
          }}
          aria-label="download file"
          sx={{ width: 30, height: 30, borderRadius: '50%' }}
        >
          <DownloadRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const fileCard = (failed = false) => (
    <Box sx={{ minWidth: { xs: 220, sm: 280 }, maxWidth: { xs: '72vw', sm: 360 } }}>
      <Box
        role={mediaType && !failed ? 'button' : undefined}
        tabIndex={mediaType && !failed ? 0 : undefined}
        onClick={mediaType && !failed ? openViewer : undefined}
        onKeyDown={(event) => {
          if (mediaType && !failed && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openViewer();
          }
        }}
        sx={{
          display: 'grid',
          gridTemplateColumns: '40px minmax(0, 1fr)',
          alignItems: 'center',
          gap: 1,
          cursor: mediaType && !failed ? 'pointer' : 'default'
        }}
      >
        <Avatar sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: failed ? 'warning.main' : mediaType === 'pdf' ? 'error.main' : 'primary.main' }}>
          {failed ? <BrokenImageRoundedIcon fontSize="small" /> : mediaType === 'pdf' ? <PictureAsPdfRoundedIcon fontSize="small" /> : <InsertDriveFileRoundedIcon fontSize="small" />}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            {failed ? 'Preview unavailable' : mediaType === 'pdf' ? 'PDF document' : fileName}
          </Typography>
          {isURL ? (
            <Stack
              component="a"
              href={text}
              target="_blank"
              rel="noopener noreferrer"
              direction="row"
              spacing={0.5}
              alignItems="center"
              onClick={(event) => event.stopPropagation()}
              sx={{
                color: isOwn ? 'inherit' : 'primary.main',
                minWidth: 0,
                textDecoration: 'none'
              }}
            >
              <LinkRoundedIcon fontSize="small" />
              <Typography variant="caption" noWrap>
                {linkLabel}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color={isOwn ? 'inherit' : 'text.secondary'} noWrap>
              {failed ? 'The attachment can still be opened or downloaded.' : 'Tap to preview'}
            </Typography>
          )}
        </Box>
      </Box>
      {fileActions}
    </Box>
  );

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', minWidth: 0 }}>
        <Stack
          direction={isOwn ? 'row-reverse' : 'row'}
          spacing={1}
          alignItems="flex-end"
          sx={{ maxWidth: { xs: '96%', sm: '84%', md: '76%' }, minWidth: 0 }}
        >
          {!isOwn ? (
            <Avatar sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: accent, fontSize: 13 }}>
              {(message.senderNickname || message.senderId || '?').slice(0, 1).toUpperCase()}
            </Avatar>
          ) : null}

          <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
            {!isOwn ? (
              <Typography variant="caption" sx={{ px: 1.25, color: 'text.secondary' }}>
                {message.senderNickname || message.senderId}
              </Typography>
            ) : null}

            <Paper
              elevation={0}
              sx={{
                px: mediaType === 'image' || mediaType === 'video' ? 0.5 : 1.5,
                py: mediaType === 'image' || mediaType === 'video' ? 0.5 : 1,
                borderRadius: '8px',
                bgcolor: (theme) =>
                  isOwn
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.72 : 0.78)
                    : alphaHex(accent, theme.palette.mode === 'dark' ? 0.2 : 0.15),
                color: isOwn ? 'primary.contrastText' : 'text.primary',
                border: '1px solid',
                borderColor: (theme) =>
                  isOwn
                    ? alpha(theme.palette.primary.light, 0.34)
                    : alphaHex(accent, theme.palette.mode === 'dark' ? 0.32 : 0.22),
                minWidth: 72,
                maxWidth: '100%',
                overflow: 'hidden',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 10px 26px rgba(0, 0, 0, 0.22)'
                    : '0 10px 24px rgba(19, 32, 39, 0.08)'
              }}
            >
              {mediaFailed ? (
                fileCard(true)
              ) : mediaType === 'image' ? (
                <Box sx={{ display: 'grid', gap: 0.75 }}>
                  <Box
                    component="img"
                    src={text}
                    alt="Shared media"
                    onClick={openViewer}
                    onError={() => setMediaFailed(true)}
                    sx={{
                      display: 'block',
                      maxWidth: { xs: 'min(68vw, 280px)', sm: 340 },
                      maxHeight: { xs: 260, sm: 320 },
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      cursor: 'zoom-in'
                    }}
                  />
                  {fileActions}
                </Box>
              ) : mediaType === 'video' ? (
                <Box sx={{ display: 'grid', gap: 0.75 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="video"
                      ref={inlineVideoRef}
                      src={text}
                      controls
                      onError={() => setMediaFailed(true)}
                      sx={{
                        display: 'block',
                        maxWidth: { xs: 'min(68vw, 280px)', sm: 360 },
                        width: '100%',
                        maxHeight: { xs: 260, sm: 320 },
                        borderRadius: '8px',
                        bgcolor: 'common.black'
                      }}
                    />
                    <IconButton
                      onClick={(event) => {
                        event.stopPropagation();
                        openViewer();
                      }}
                      aria-label="open video preview"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: 'rgba(0, 0, 0, 0.52)',
                        color: 'common.white',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.72)' }
                      }}
                    >
                      <OpenInFullRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {fileActions}
                  {isURL ? (
                    <Stack
                      component="a"
                      href={text}
                      target="_blank"
                      rel="noopener noreferrer"
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      sx={{ color: isOwn ? 'inherit' : 'primary.main', minWidth: 0, textDecoration: 'none' }}
                    >
                      <LinkRoundedIcon fontSize="small" />
                      <Typography variant="caption" noWrap>
                        {linkLabel}
                      </Typography>
                    </Stack>
                  ) : null}
                </Box>
              ) : mediaType === 'pdf' || isGenericFile ? (
                fileCard(false)
              ) : isURL ? (
                <Box
                  component="a"
                  href={text}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '36px minmax(0, 1fr)',
                    gap: 1,
                    alignItems: 'center',
                    color: isOwn ? 'inherit' : 'primary.main',
                    textDecoration: 'none',
                    minWidth: { xs: 190, sm: 240 },
                    maxWidth: { xs: '72vw', sm: 320 }
                  }}
                >
                  <Avatar sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: isOwn ? 'rgba(255,255,255,0.18)' : 'action.hover' }}>
                    <LinkRoundedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {linkLabel}
                    </Typography>
                    <Typography variant="caption" color={isOwn ? 'inherit' : 'text.secondary'} noWrap>
                      Open link
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {message.text}
                </Typography>
              )}
            </Paper>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5, px: 1.25, textAlign: isOwn ? 'right' : 'left' }}
            >
              {formatClock(message.timestamp)} {isOwn ? `· ${message.status}` : ''}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Dialog
        open={Boolean(viewerMedia)}
        onClose={() => setViewerMedia(null)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            bgcolor: viewerMedia?.type === 'pdf' ? 'background.paper' : 'common.black',
            color: viewerMedia?.type === 'pdf' ? 'text.primary' : 'common.white',
            overflow: 'hidden',
            borderRadius: { xs: 0, sm: '8px' },
            width: '100%'
          }
        }}
      >
        {viewerMedia ? (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 1,
              p: 0.5,
              borderRadius: '999px',
              bgcolor: viewerMedia.type === 'pdf' ? 'background.paper' : 'rgba(0, 0, 0, 0.48)',
              color: viewerMedia.type === 'pdf' ? 'text.primary' : 'common.white',
              boxShadow: '0 8px 22px rgba(0, 0, 0, 0.24)'
            }}
          >
            {viewerMedia.type === 'image' ? (
              <>
                <Tooltip title="Zoom out">
                  <span>
                    <IconButton
                      size="small"
                      disabled={imageZoom <= 0.5}
                      onClick={() => setViewerZoom(imageZoom - 0.25)}
                      aria-label="zoom out"
                      sx={{ color: 'inherit' }}
                    >
                      <ZoomOutRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="caption" sx={{ minWidth: 38, textAlign: 'center' }}>
                  {Math.round(imageZoom * 100)}%
                </Typography>
                <Tooltip title="Zoom in">
                  <IconButton
                    size="small"
                    onClick={() => setViewerZoom(imageZoom + 0.25)}
                    aria-label="zoom in"
                    sx={{ color: 'inherit' }}
                  >
                    <ZoomInRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reset zoom">
                  <IconButton
                    size="small"
                    onClick={() => setViewerZoom(1)}
                    aria-label="reset zoom"
                    sx={{ color: 'inherit' }}
                  >
                    <RestartAltRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
            <Tooltip title="Download">
              <IconButton
                size="small"
                onClick={() => void downloadSource(viewerMedia.src, fileName)}
                aria-label="download"
                sx={{ color: 'inherit' }}
              >
                <DownloadRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}

        <IconButton
          onClick={() => setViewerMedia(null)}
          aria-label="close media viewer"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            bgcolor: 'rgba(0, 0, 0, 0.48)',
            color: 'common.white',
            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.68)' }
          }}
        >
          <CloseRoundedIcon />
        </IconButton>

        <Box
          sx={{
            minHeight: viewerMedia?.type === 'pdf' ? { xs: '78vh', sm: '76vh' } : { xs: '58vh', sm: '72vh' },
            height: viewerMedia?.type === 'pdf' ? { xs: '86vh', sm: '80vh' } : 'auto',
            maxHeight: '86vh',
            display: 'grid',
            placeItems: 'center',
            p: viewerMedia?.type === 'pdf' ? 0 : { xs: 1, sm: 2 },
            overflow: viewerMedia?.type === 'image' ? 'hidden' : 'hidden',
            touchAction: viewerMedia?.type === 'image' ? 'none' : 'auto'
          }}
          onWheel={(event) => {
            if (viewerMedia?.type !== 'image') {
              return;
            }

            event.preventDefault();
            const direction = event.deltaY > 0 ? -1 : 1;
            setViewerZoom(imageZoom + direction * 0.15);
          }}
        >
          {viewerMedia?.type === 'image' ? (
            <Box
              component="img"
              src={viewerMedia.src}
              alt="Shared media preview"
              onError={() => setMediaFailed(true)}
              onClick={() => {
                if (imagePanRef.current.moved) {
                  imagePanRef.current.moved = false;
                  return;
                }

                zoomImageIn();
              }}
              onPointerDown={startImagePan}
              onPointerMove={moveImagePan}
              onPointerUp={stopImagePan}
              onPointerCancel={stopImagePan}
              sx={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                cursor: imageZoom > 1 ? (imageGrabbing ? 'grabbing' : 'grab') : 'zoom-in',
                transform: `translate3d(${imageOffset.x}px, ${imageOffset.y}px, 0) scale(${imageZoom})`,
                transformOrigin: 'center',
                transition: imageGrabbing ? 'none' : 'transform 160ms ease',
                userSelect: 'none',
                WebkitUserDrag: 'none'
              }}
            />
          ) : viewerMedia?.type === 'video' ? (
            <Box
              component="video"
              src={viewerMedia.src}
              controls
              autoPlay
              onError={() => setMediaFailed(true)}
              sx={{
                display: 'block',
                width: 'auto',
                maxWidth: '100%',
                maxHeight: '82vh',
                objectFit: 'contain',
                bgcolor: 'common.black'
              }}
            />
          ) : viewerMedia?.type === 'pdf' ? (
            <Box
              component="iframe"
              src={viewerMedia.src}
              title="PDF preview"
              sx={{
                width: '100%',
                height: '100%',
                border: 0,
                bgcolor: 'background.paper'
              }}
            />
          ) : null}
        </Box>
      </Dialog>
    </>
  );
}
