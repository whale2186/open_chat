import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Fade,
  IconButton,
  LinearProgress,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import SendRoundedIcon from "@mui/icons-material/SendRounded";
import MoodRoundedIcon from "@mui/icons-material/MoodRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

const EMOJIS = ["😀","😂","😍","👍","🙏","🔥","🎉","🙂","😎","🙌","❤️","🤝"];
const MAX_FILE_SIZE = 750 * 1024;
const PROXY_API = "https://catmoe-proxy.onrender.com/upload";

export default function MessageComposer({
  disabled,
  onSend,
  currentNickname,
}: {
  disabled?: boolean;
  onSend: (message: string) => void;
  currentNickname: string;
}) {
  const [value, setValue] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver,setDragOver]=useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const uploading = uploadProgress !== null;
  const canUpload = !disabled && !uploading;



  const submit = () => {
    if (disabled || uploading || !value.trim()) {
      return;
    }

    onSend(value);
    setValue("");
  };

  const uploadFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", PROXY_API);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        setUploadProgress(null);

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error("Upload failed."));
          return;
        }

        try {
          const json = JSON.parse(xhr.responseText);

          if (!json.success) {
            reject(new Error(json.error || "Upload failed."));
            return;
          }

          resolve(json.url);
        } catch {
          reject(new Error("Invalid server response."));
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        reject(new Error("Network error."));
      };

      xhr.send(form);
    });

  const handleFile = async (file: File) => {
    try {
      if (file.size <= MAX_FILE_SIZE) {
        const base64 = await readAsDataURL(file);
        onSend(base64);
        return;
      }

      const url = await uploadFile(file);
      onSend(url);
    } catch (err) {
      setUploadProgress(null);
      alert(err instanceof Error ? err.message : "Failed to upload file.");
    }
  };

  function readAsDataURL(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      await handleFile(file);
    }
  };

  useEffect(() => {
    const hasFiles = (event: globalThis.DragEvent) =>
      Array.from(event.dataTransfer?.types || []).includes("Files");

    const resetDrag = () => {
      dragDepthRef.current = 0;
      setDragOver(false);
    };

    const handleWindowDragEnter = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current += 1;

      if (canUpload) {
        setDragOver(true);
      }
    };

    const handleWindowDragOver = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = canUpload ? "copy" : "none";
      }

      if (canUpload) {
        setDragOver(true);
      }
    };

    const handleWindowDragLeave = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

      if (dragDepthRef.current === 0) {
        setDragOver(false);
      }
    };

    const handleWindowDrop = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      resetDrag();

      if (canUpload && files.length) {
        void handleFiles(files);
      }
    };

    const handleWindowBlur = () => resetDrag();

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [canUpload]);

  return (
    <Box
      sx={{
        width:"100%",
        minWidth:0,
        borderRadius:999,
        outline:dragOver?"2px dashed":"none",
        outlineColor:"primary.main"
      }}
    >
      <Fade in={dragOver}>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            display: dragOver ? 'grid' : 'none',
            placeItems: 'center',
            pointerEvents: 'none',
            bgcolor: 'rgba(0, 0, 0, 0.38)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        >
          <Paper
            elevation={0}
            sx={{
              px: 3,
              py: 2,
              border: '2px dashed',
              borderColor: canUpload ? 'primary.main' : 'error.main',
              borderRadius: '16px',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} align="center">
              {canUpload ? 'Drop files to upload' : 'Connect before uploading'}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Multiple files are supported.
            </Typography>
          </Paper>
        </Box>
      </Fade>
      <Stack spacing={0.75}>


        <Fade in={uploading}>
          <Box>
            {uploading && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{display:"flex",justifyContent:"space-between",mb:0.5}}>
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress ?? 0} sx={{height:6,borderRadius:"8px"}} />
              </>
            )}
          </Box>
        </Fade>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 48px',
            gap: { xs: 0.75, sm: 1 },
            alignItems: 'end',
            minWidth: 0
          }}
        >
          <Paper
            elevation={0}
            sx={{
              minWidth: 0,
              minHeight: 48,
              display: 'grid',
              gridTemplateColumns: '40px minmax(0, 1fr) 40px',
              alignItems: 'end',
              gap: 0.25,
              p: '4px 6px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: dragOver ? 'primary.main' : 'divider',
              bgcolor: dragOver ? 'action.hover' : 'background.paper',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.18)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)'
            }}
          >
            <IconButton
              disabled={disabled || uploading}
              onClick={(e)=>setAnchorEl(e.currentTarget)}
              aria-label="add emoji"
              sx={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
            >
              <MoodRoundedIcon/>
            </IconButton>

            <TextField
              disabled={disabled || uploading}
              value={value}
              onChange={(e)=>setValue(e.target.value)}
              placeholder={uploading?"Uploading...":disabled?"Connecting…":"Message"}
              multiline
              minRows={1}
              maxRows={4}
              fullWidth
              size="small"
              sx={{
                minWidth:0,
                '& .MuiOutlinedInput-root': {
                  alignItems: 'center',
                  borderRadius: 0,
                  p: 0,
                  bgcolor: 'transparent',
                  '& fieldset': { border: 0 },
                  '&:hover fieldset': { border: 0 },
                  '&.Mui-focused fieldset': { border: 0 }
                },
                '& .MuiInputBase-input': {
                  px: 0.5,
                  py: '9px'
                },
                '& textarea': {
                  lineHeight: 1.45
                }
              }}
              onKeyDown={(e)=>{
                if(e.key==="Enter" && !e.shiftKey){
                  e.preventDefault();
                  submit();
                }
              }}
            />

            <IconButton
              disabled={disabled || uploading}
              onClick={()=>fileInputRef.current?.click()}
              aria-label="attach file"
              sx={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }}
            >
              <AttachFileRoundedIcon/>
            </IconButton>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={async (e)=>{
                const files = Array.from(e.target.files || []);
                if(files.length) await handleFiles(files);
                e.target.value="";
              }}
            />
          </Paper>

          <Tooltip title="Send">
            <span>
              <IconButton
                color="primary"
                onClick={submit}
                disabled={disabled || uploading || !value.trim()}
                aria-label="send message"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled'
                  }
                }}
              >
                <SendRoundedIcon/>
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={()=>setAnchorEl(null)}
        anchorOrigin={{vertical:"top",horizontal:"center"}}
        transformOrigin={{vertical:"bottom",horizontal:"center"}}
      >
        <Box sx={{p:1.5,maxWidth:280}}>
          <Typography variant="subtitle2" fontWeight={800} sx={{mb:1}}>
            Emoji
          </Typography>

          <Box sx={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:0.5}}>
            {EMOJIS.map((emoji)=>(
              <Button
                key={emoji}
                variant="outlined"
                sx={{minWidth:0,width:38,height:38,p:0,borderRadius:"8px"}}
                onClick={()=>{
                  setValue((p)=>p+emoji);
                  setAnchorEl(null);
                }}
              >
                {emoji}
              </Button>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
