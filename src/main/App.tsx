import Display from '@/components/display';
import { queryClient } from '@/lib/queries';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

import DownloadPanel from '../components/panel';
import Setting from '../components/setting';
import usePreferTheme from '../theme';

function ThemeWrapper() {
  const preferTheme = usePreferTheme(); // Now inside provider

  return (
    <ThemeProvider theme={preferTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/download" element={<DownloadPanel />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="/" element={<Display />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeWrapper />
    </QueryClientProvider>
  );
}

export default App;
