import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, styled, ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

import { GetJobs } from './aria2';
import DownloadList from './components/content';
import CreationArea from './components/create';
import Header from './components/header';
import DownloadPanel from './components/panel';
import Scripts from './components/scripts';
import Setting from './components/setting';
import { IJob } from './types';

const DisplayHolder = styled(Container)(({ theme }) => ({
  width: '100%',
  minWidth: 360,
  maxWidth: 420,
  backgroundColor: theme.palette.background.paper,
}));

function Display(): JSX.Element {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [checked, setChecked] = useState(['']);
  const [show, setShow] = useState(false);

  useEffect(() => getJobStatus(), []);

  useEffect(() => {
    const interval = setInterval(() => getJobStatus(), 1000);
    return () => clearInterval(interval);
  }, []);

  function getJobStatus() {
    GetJobs()
      .then((data: IJob[]) => setJobs(data))
      .catch((err: any) => console.error(err));
  }

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  return (
    <DisplayHolder maxWidth={false} disableGutters>
      <Header
        jobs={jobs}
        checked={checked}
        show={show}
        setShow={() => setShow(prevState => !prevState)}
        setCheck={setChecked}
      />
      {show ? (
        <CreationArea close={() => setShow(false)} />
      ) : (
        <DownloadList jobs={jobs} checked={checked} toggle={handleToggle} />
      )}
    </DisplayHolder>
  );
}

function App(): JSX.Element {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/download" element={<DownloadPanel />} />
          <Route path="/script" element={<Scripts />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="/" element={<Display />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
