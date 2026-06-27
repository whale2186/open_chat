import { ThemeOptions } from '@mui/material/styles';

export const cyanThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: { main: '#00acc1' },
    secondary: { main: '#0097a7' },
    background: {
      default: '#f4f8f9',
      paper: '#ffffff'
    },
    text: {
      primary: '#132027',
      secondary: '#5f6f78'
    },
    divider: '#dde7eb'
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44 }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 8
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        size: 'small'
      }
    }
  }
};

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: { main: '#26c6da' },
    secondary: { main: '#4dd0e1' },
    background: {
      default: '#0d1418',
      paper: '#141d22'
    },
    text: {
      primary: '#eef4f6',
      secondary: '#9fb1b8'
    },
    divider: '#233139'
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44 }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 8
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        size: 'small'
      }
    }
  }
};
