import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import React, { useEffect, useState } from 'react';

import { GetJobs } from './aria2';
import DownloadList from './components/content';
import CreationArea from './components/create';
import Header from './components/header';
import { IJob } from './types';

function App(): JSX.Element {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode]
  );

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;
