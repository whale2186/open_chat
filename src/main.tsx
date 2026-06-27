import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import App from './App';
import { SettingsProvider } from './state/SettingsContext';
import { RoomsProvider } from './state/RoomsContext';
import { SessionProvider } from './state/SessionContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <RoomsProvider>
          <SessionProvider>
            <CssBaseline />
            <App />
          </SessionProvider>
        </RoomsProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
