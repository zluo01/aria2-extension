import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Fade from '@mui/material/Fade';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import NativeSelect from '@mui/material/NativeSelect';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getConfiguration,
  getScripts,
  setConfiguration,
  updateScripts,
} from '../../browser';
import { DEFAULT_CONFIG, IConfig, IScript } from '../../types';

const EditSection = styled('div')({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ScriptList = styled('div')(({ theme }) => ({
  height: 382,
  border: '1px solid',
  borderColor: theme.palette.text.secondary,
  overflow: 'auto',
}));

const SettingButton = styled(Button)({
  width: 80,
  height: 40,
});

const HiddenMenuInput = styled(Input)({
  display: 'none',
});

const HiddenMenuInputLabel = styled(InputLabel)({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  paddingTop: 6,
  paddingBottom: 6,
  color: 'inherit',
  cursor: 'inherit',
});

const ScriptTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: 6,
  marginBottom: 6,
}));

function Setting(): JSX.Element {
  const navigate = useNavigate();

  const protocol = {
    ws: 'WebSocket',
    wss: 'WebSocket (Security)',
    http: 'Http',
    https: 'Https',
  };

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<IConfig>(DEFAULT_CONFIG);
  const [scripts, setScripts] = useState<IScript[]>([]);

  // dropdown button
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    getConfiguration()
      .then(config => setConfig(config))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    getScripts()
      .then(scripts => setScripts(scripts))
      .catch(err => console.error(err));
  }, []);

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }

  async function handleClose() {
    setAnchorEl(null);
  }

  async function handleAddScript() {
    navigate('/script');
    await handleClose();
  }

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

  async function handleEdit(index: number) {
    navigate(`/script?id=${index}`);
  }

  async function handleDelete(index: number) {
    const result = [...scripts];
    result.splice(index, 1);
    await updateScripts(result);
    setScripts(result);
  }

  async function handleImport(e: any) {
    const fileReader = new FileReader();

    fileReader.readAsText(e.target.files[0]);
    fileReader.onload = async e => {
      const res = JSON.parse(e.target?.result as string);
      await updateScripts(res);
      setScripts(res);
      await handleClose();
    };
  }

  async function handleExport() {
    const fileName = 'scripts';
    const json = JSON.stringify(scripts);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await handleClose();
  }

  return (
    <Container maxWidth={'md'} fixed>
      <TextField
        label="Default Download Path"
        helperText="Download path of Aria2(only), optional"
        InputLabelProps={{
          shrink: true,
        }}
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
        InputLabelProps={{
          shrink: true,
        }}
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
        InputLabelProps={{
          shrink: true,
        }}
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
        InputLabelProps={{
          shrink: true,
        }}
        value={config?.token}
        onChange={updateToken}
        variant="standard"
        margin="normal"
        fullWidth
      />
      <EditSection>
        <ScriptTitle variant="body1">Scripts</ScriptTitle>
        <Fragment>
          <IconButton
            color="inherit"
            aria-label="menu"
            aria-controls="option-menu"
            aria-haspopup="true"
            onClick={handleClick}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            TransitionComponent={Fade}
          >
            <MenuItem onClick={handleAddScript}>New Script</MenuItem>
            <MenuItem>
              <HiddenMenuInput
                type={'file'}
                id={'file'}
                inputProps={{
                  accept: 'application/json',
                }}
                onChange={handleImport}
              />
              <HiddenMenuInputLabel htmlFor={'file'}>
                Import
              </HiddenMenuInputLabel>
            </MenuItem>
            <MenuItem onClick={handleExport} disabled={!scripts.length}>
              Export
            </MenuItem>
          </Menu>
        </Fragment>
      </EditSection>
      <ScriptList>
        <List>
          {scripts.map((value, index) => (
            <ListItem
              key={index}
              button
              onDoubleClick={() => handleEdit(index)}
              divider
              dense
            >
              <ListItemText primary={value.name} secondary={value.domain} />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleEdit(index)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDelete(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </ScriptList>
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1}
        sx={{ pt: 1 }}
      >
        <SettingButton
          variant="outlined"
          color="secondary"
          disabled={loading}
          onClick={() => window.close()}
        >
          Close
        </SettingButton>
        <SettingButton
          variant="outlined"
          color="primary"
          disabled={loading}
          onClick={() => updateConfig()}
        >
          Save
        </SettingButton>
      </Stack>
    </Container>
  );
}

export default Setting;
