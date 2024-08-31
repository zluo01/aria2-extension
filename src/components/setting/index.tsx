import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import NativeSelect from '@mui/material/NativeSelect';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { setConfiguration } from '@src/browser';
import { useGetConfigurationQuery } from '@src/lib/queries';
import manifest from '@src/manifest';
import { IConfig, Theme } from '@src/types';
import React from 'react';

function Setting(): JSX.Element {
  const protocol = {
    ws: 'WebSocket',
    wss: 'WebSocket (Security)',
    http: 'Http',
    https: 'Https',
  };

  const { data: config, mutate: mutateConfig } = useGetConfigurationQuery();

  async function updateTheme(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, theme: e.target.value as Theme });
    }
  }

  async function updateDownloadPath(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, path: e.target.value });
    }
  }

  async function updateHost(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, host: e.target.value });
    }
  }

  async function updatePort(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, port: parseInt(e.target.value) });
    }
  }

  async function updateToken(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, token: e.target.value });
    }
  }

  async function updateProtocol(
    e: React.ChangeEvent<HTMLSelectElement>,
  ): Promise<void> {
    if (config) {
      await updateConfig({ ...config, protocol: e.target.value });
    }
  }

  async function updateConfig(config: IConfig) {
    try {
      await setConfiguration(config);
      await mutateConfig();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Container maxWidth={'md'} fixed>
      <TextField
        label="Theme"
        value={config?.theme || Theme.FOLLOWING_SYSTEM}
        onChange={updateTheme}
        helperText="Please select prefer theme"
        variant="standard"
        margin="normal"
        fullWidth
        select
      >
        {Object.values(Theme).map(theme => (
          <MenuItem key={theme} value={theme}>
            {theme}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Default Download Path"
        helperText="Download path of Aria2(only), optional"
        value={config?.path}
        onChange={updateDownloadPath}
        variant="standard"
        margin="normal"
        fullWidth
      />
      <FormControl fullWidth margin="normal" required>
        <InputLabel variant={'standard'}>Protocol</InputLabel>
        <NativeSelect
          variant="standard"
          value={config?.protocol}
          onChange={updateProtocol}
        >
          {Object.entries(protocol).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </NativeSelect>
        <FormHelperText variant={'standard'}>
          RPC connection protocol of Aria2. Support ws, wss, http and https.
        </FormHelperText>
      </FormControl>
      <TextField
        label="Host"
        helperText="RPC host of Aria2. You can use ip or domain name."
        value={config?.host}
        onChange={updateHost}
        variant="standard"
        margin="normal"
        fullWidth
        required
      />
      <TextField
        label="Port"
        helperText="Aria2 RPC port"
        value={config?.port}
        onChange={updatePort}
        variant="standard"
        margin="normal"
        fullWidth
        required
      />
      <TextField
        label="Token"
        helperText="Aria2 RPC secret, optional."
        value={config?.token}
        onChange={updateToken}
        variant="standard"
        margin="normal"
        fullWidth
      />
      <Divider sx={{ pt: 2 }} />
      <Typography sx={{ py: 1 }} align="right">
        v{manifest.version}
      </Typography>
    </Container>
  );
}

export default Setting;
