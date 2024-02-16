import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { styled, ThemeProvider } from '@mui/material/styles';
import { useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';

import DownloadList from '../components/content';
import CreationArea from '../components/create';
import Header from '../components/header';
import DownloadPanel from '../components/panel';
import Setting from '../components/setting';
import { useGetTasksQuery } from '../lib/queries';
import usePreferTheme from '../theme';

const DisplayHolder = styled(Container)(({ theme }) => ({
  width: '100%',
  minWidth: 360,
  maxWidth: 420,
  backgroundColor: theme.palette.background.paper,
}));

function Display(): JSX.Element {
  const [checked, setChecked] = useState(['']);
  const [show, setShow] = useState(false);

  const { data: jobs } = useGetTasksQuery();

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
        jobs={jobs || []}
        checked={checked}
        show={show}
        setShow={() => setShow(prevState => !prevState)}
        setCheck={setChecked}
      />
      {show ? (
        <CreationArea close={() => setShow(false)} />
      ) : (
        <DownloadList
          jobs={jobs || []}
          checked={checked}
          toggle={handleToggle}
        />
      )}
    </DisplayHolder>
  );
}

function App(): JSX.Element {
  const preferTheme = usePreferTheme();

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

export default App;
