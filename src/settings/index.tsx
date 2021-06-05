import CssBaseline from '@material-ui/core/CssBaseline';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useMemo, StrictMode } from 'react';
import ReactDOM from 'react-dom';
import { MemoryRouter as Router, Route, Switch } from 'react-router-dom';

import EditScript from '../components/editScript';
import Setting from '../components/setting';

function Home(): JSX.Element {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Switch>
          <Route exact path="/">
            <Setting />
          </Route>
          <Route path="/edit">
            <EditScript />
          </Route>
        </Switch>
      </Router>
    </ThemeProvider>
  );
}

ReactDOM.render(
  <StrictMode>
    <Home />
  </StrictMode>,
  document.getElementById('settings')
);
