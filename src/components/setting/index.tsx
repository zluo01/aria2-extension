import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Fade from '@material-ui/core/Fade';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NativeSelect from '@material-ui/core/NativeSelect';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import {
  getConfiguration,
  getScripts,
  setConfiguration,
  updateScripts,
} from '../../browser';
import { DEFAULT_CONFIG, IConfig, IScript } from '../../types';

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
    text: {
      color: theme.palette.text.secondary,
      marginTop: 6,
      marginBottom: 6,
    },
    row: {
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    placeHolder: {
      height: 382,
      border: '1px solid',
      borderColor: theme.palette.text.secondary,
      overflow: 'auto',
    },
  })
);

function Setting(): JSX.Element {
  const classes = useStyles();
  const history = useHistory();

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
  const [open, setOpen] = React.useState(false);
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
    history.push('/edit');
    setOpen(false);
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
    history.push(`/edit?id=${index}`);
  }

  async function handleDelete(index: number) {
    const result = [...scripts];
    result.splice(index, 1);
    await updateScripts(result);
    setScripts(result);
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
      <div className={classes.row}>
        <Typography variant="body1" className={classes.text}>
          Scripts
        </Typography>
        <div>
          <IconButton
            aria-controls={open ? 'menu-list-grow' : undefined}
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
            <MenuItem onClick={handleClose}>Import</MenuItem>
            <MenuItem onClick={handleClose}>Export</MenuItem>
          </Menu>
        </div>
      </div>
      <div className={classes.placeHolder}>
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
      </div>
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

export default Setting;
