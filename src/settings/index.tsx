import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import InputLabel from '@material-ui/core/InputLabel';
import NativeSelect from '@material-ui/core/NativeSelect';
import TextField from '@material-ui/core/TextField';
import {
  createStyles,
  makeStyles,
  Theme,
  createMuiTheme,
  ThemeProvider,
} from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import React, { useMemo, StrictMode, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { getConfiguration, setConfiguration } from '../browser';
import { DEFAULT_CONFIG, IConfig } from '../types';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttonGroup: {
      width: '100%',
      display: 'flex',
      justifyContent: 'flex-end',

      '& > *': {
        margin: theme.spacing(1),
      },
    },
    button: {
      width: 80,
      height: 40,
    },
  })
);

function Setting(): JSX.Element {
  const classes = useStyles();

  const protocol = {
    ws: 'WebSocket',
    wss: 'WebSocket (Security)',
    http: 'Http',
    https: 'Https',
  };

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<IConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    getConfiguration()
      .then(config => setConfig(config))
      .catch(err => console.error(err));
  }, []);

  async function updateDownloadPath(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ): Promise<void> {
    setConfig(prevState => ({ ...prevState, path: e.target.value }));
  }

  async function updateHost(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ): Promise<void> {
    setConfig(prevState => ({ ...prevState, host: e.target.value }));
  }

  async function updatePort(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ): Promise<void> {
    setConfig(prevState => ({ ...prevState, port: parseInt(e.target.value) }));
  }

  async function updateToken(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ): Promise<void> {
    setConfig(prevState => ({ ...prevState, token: e.target.value }));
  }

  async function updateProtocol(
    e: React.ChangeEvent<HTMLSelectElement>
  ): Promise<void> {
    setConfig(prevState => ({ ...prevState, protocol: e.target.value }));
  }

  async function updateConfig() {
    try {
      setLoading(true);
      await setConfiguration(config);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Container maxWidth={'md'} fixed>
      <TextField
        label="Default Download Path"
        helperText="Download path of Aria2(only), optional"
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={config?.path}
        onChange={updateDownloadPath}
      />
      <FormControl fullWidth margin="normal" required>
        <InputLabel shrink>Protocol</InputLabel>
        <NativeSelect value={config?.protocol} onChange={updateProtocol}>
          {Object.entries(protocol).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </NativeSelect>
        <FormHelperText>
          RPC connection protocol of Aria2. Support ws, wss, http and https.
        </FormHelperText>
      </FormControl>
      <TextField
        label="Host"
        helperText="RPC host of Aria2. You can use ip or domain name."
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={config?.host}
        onChange={updateHost}
        required
      />
      <TextField
        label="Port"
        helperText="Aria2 RPC port"
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={config?.port}
        onChange={updatePort}
        required
      />
      <TextField
        label="Token"
        helperText="Aria2 RPC secret, optional."
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={config?.token}
        onChange={updateToken}
      />
      <div className={classes.buttonGroup}>
        <Button
          className={classes.button}
          variant="outlined"
          color="secondary"
          disabled={loading}
          onClick={() => window.close()}
        >
          Close
        </Button>
        <Button
          className={classes.button}
          variant="outlined"
          color="primary"
          disabled={loading}
          onClick={() => updateConfig()}
        >
          Save
        </Button>
      </div>
    </Container>
  );
}

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
      <Setting />
    </ThemeProvider>
  );
}

ReactDOM.render(
  <StrictMode>
    <Home />
  </StrictMode>,
  document.getElementById('settings')
);
