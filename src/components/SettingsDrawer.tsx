import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import WallpaperRoundedIcon from '@mui/icons-material/WallpaperRounded';
import { useMediaQuery } from '@mui/material';
import type { AppSettings } from '../types';

const BASIC_COLORS = [
  '#26c6da',
  '#2196f3',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#64748b'
];

type Props = {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onChange: (partial: Partial<AppSettings>) => void;
  mode: 'light' | 'dark';
};

export default function SettingsDrawer({ open, onClose, settings, onChange, mode }: Props) {
  const isDesktop = useMediaQuery('(min-width:900px)');
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState(settings.nickname);
  const [backgroundDraft, setBackgroundDraft] = useState(settings.chatBackgroundImage);
  const [colorDraft, setColorDraft] = useState(settings.accentColor);

  useEffect(() => {
    setNicknameDraft(settings.nickname);
    setBackgroundDraft(settings.chatBackgroundImage);
    setColorDraft(settings.accentColor);
  }, [settings.nickname, settings.chatBackgroundImage, settings.accentColor, open]);

  const paperSx = useMemo(() => ({
    width: isDesktop ? 420 : '100%',
    maxWidth: '100%'
  }), [isDesktop]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

  const prepareBackgroundImage = async (file: File) => {
    const rawDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(rawDataUrl);
    const maxDimension = 1800;
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');

    if (!context) {
      return rawDataUrl;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.84);
  };

  const handleBackgroundFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    try {
      const nextBackground = await prepareBackgroundImage(file);
      setBackgroundDraft(nextBackground);
      onChange({ chatBackgroundImage: nextBackground });
    } catch {
      alert('Could not load that image.');
    }
  };

  const saveCurrentColor = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(settings.accentColor)) {
      return;
    }

    const nextColor = settings.accentColor.toLowerCase();
    const savedColors = settings.savedAccentColors.map((color) => color.toLowerCase());

    if (savedColors.includes(nextColor)) {
      return;
    }

    onChange({
      savedAccentColors: [nextColor, ...savedColors].slice(0, 20)
    });
  };

  const removeSavedColor = (color: string) => {
    onChange({
      savedAccentColors: settings.savedAccentColors.filter(
        (savedColor) => savedColor.toLowerCase() !== color.toLowerCase()
      )
    });
  };

  const content = (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneRoundedIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>Settings</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="close">
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      <Divider />

      <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Profile
            </Typography>
            <TextField
              label="Nickname"
              value={nicknameDraft}
              onChange={(e) => setNicknameDraft(e.target.value)}
              onBlur={() => onChange({ nickname: nicknameDraft.trim() })}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Room defaults
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.offlineMessagesEnabled}
                  onChange={(event) => onChange({ offlineMessagesEnabled: event.target.checked })}
                />
              }
              label="Offline messages"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Chat data
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.persistentChatEnabled}
                  onChange={(event) => onChange({ persistentChatEnabled: event.target.checked })}
                />
              }
              label="Persistent chat"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Theme
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant={mode === 'light' ? 'contained' : 'outlined'}
                startIcon={<LightModeOutlinedIcon />}
                onClick={() => onChange({ themeMode: 'light' })}
              >
                Light
              </Button>
              <Button
                fullWidth
                variant={mode === 'dark' ? 'contained' : 'outlined'}
                startIcon={<DarkModeOutlinedIcon />}
                onClick={() => onChange({ themeMode: 'dark' })}
              >
                Dark
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Global color
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
              {BASIC_COLORS.map((color) => {
                const selected = settings.accentColor.toLowerCase() === color.toLowerCase();

                return (
                <Tooltip key={color} title={color}>
                    <IconButton
                      onClick={() => {
                        setColorDraft(color);
                        onChange({ accentColor: color });
                      }}
                      aria-label={`use ${color} accent color`}
                      sx={{
                        height: 42,
                        border: '2px solid',
                        borderColor: selected ? 'text.primary' : 'divider',
                        borderRadius: '8px',
                        bgcolor: color,
                        '&:hover': { bgcolor: color, filter: 'brightness(0.96)' }
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }}>
              <TextField
                label="Advanced color"
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(colorDraft) ? colorDraft : settings.accentColor}
                onChange={(event) => {
                  setColorDraft(event.target.value);
                  onChange({ accentColor: event.target.value });
                }}
                sx={{ maxWidth: 120 }}
              />
              <TextField
                label="Hex"
                value={colorDraft}
                onChange={(event) => {
                  const value = event.target.value;

                  if (/^#[0-9a-fA-F]{0,6}$/.test(value)) {
                    setColorDraft(value);

                    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                      onChange({ accentColor: value });
                    }
                  }
                }}
                onBlur={() => {
                  if (/^#[0-9a-fA-F]{6}$/.test(colorDraft)) {
                    onChange({ accentColor: colorDraft });
                  } else {
                    setColorDraft(settings.accentColor);
                  }
                }}
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                onClick={saveCurrentColor}
                disabled={
                  !/^#[0-9a-fA-F]{6}$/.test(settings.accentColor) ||
                  settings.savedAccentColors.some((color) => color.toLowerCase() === settings.accentColor.toLowerCase())
                }
              >
                Save color
              </Button>
            </Stack>

            {settings.savedAccentColors.length ? (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Saved colors
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
                  {settings.savedAccentColors.map((color) => {
                    const selected = settings.accentColor.toLowerCase() === color.toLowerCase();

                    return (
                      <Box key={color} sx={{ position: 'relative' }}>
                        <Tooltip title={color}>
                          <IconButton
                            onClick={() => {
                              setColorDraft(color);
                              onChange({ accentColor: color });
                            }}
                            aria-label={`use saved ${color} accent color`}
                            sx={{
                              width: '100%',
                              height: 42,
                              border: '2px solid',
                              borderColor: selected ? 'text.primary' : 'divider',
                              borderRadius: '8px',
                              bgcolor: color,
                              '&:hover': { bgcolor: color, filter: 'brightness(0.96)' }
                            }}
                          />
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => removeSavedColor(color)}
                          aria-label={`remove saved ${color} color`}
                          sx={{
                            position: 'absolute',
                            top: -7,
                            right: -7,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'background.paper' }
                          }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : null}
          </Box>

          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WallpaperRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800}>Chat background</Typography>
            </Stack>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (event) => {
                await handleBackgroundFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {backgroundDraft.trim() ? (
              <Box
                sx={{
                  height: 96,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.18)), url(${JSON.stringify(backgroundDraft.trim())})`,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover'
                }}
              />
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={() => backgroundInputRef.current?.click()}>
                Select photo
              </Button>
              <Button
                color="inherit"
                disabled={!backgroundDraft}
                onClick={() => {
                  setBackgroundDraft('');
                  onChange({ chatBackgroundImage: '' });
                }}
              >
                Clear
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Done</Button>
        <Button
          variant="contained"
          onClick={() => onChange({
            nickname: nicknameDraft.trim(),
            chatBackgroundImage: backgroundDraft.trim()
          })}
        >
          Save
        </Button>
      </DialogActions>
    </Box>
  );

  return (
    <Drawer
      anchor={isDesktop ? 'right' : 'bottom'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          ...paperSx,
          height: isDesktop ? '100%' : '88vh',
          borderTopLeftRadius: isDesktop ? 0 : 20,
          borderTopRightRadius: isDesktop ? 0 : 20
        }
      }}
    >
      {content}
    </Drawer>
  );
}
