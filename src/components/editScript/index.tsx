import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/theme/material.css';
import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { useHistory, useLocation } from 'react-router-dom';

import { addScript, getScripts } from '../../browser';
import { DEFAULT_SCRIPT, IScript } from '../../types';
import './index.css';

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
      marginBottom: 8,
    },
  })
);

function EditScript(): JSX.Element {
  const classes = useStyles();
  const history = useHistory();

  const [script, setScript] = useState<IScript>(DEFAULT_SCRIPT);

  const location = useLocation();
  const id = location.search.replace('?id=', '');

  useEffect(() => {
    if (id) {
      getScripts()
        .then(scripts => setScript(scripts[parseInt(id)]))
        .catch(err => console.error(err));
    }
  }, []);

  async function updateScriptName(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) {
    setScript(prevState => ({ ...prevState, name: e.target.value }));
  }

  async function updateScriptDomain(
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) {
    setScript(prevState => ({ ...prevState, domain: e.target.value }));
  }

  async function handleCancel() {
    history.push('/');
  }

  async function handleAddScript() {
    await addScript(script, parseInt(id));
    await handleCancel();
  }

  return (
    <Container maxWidth={'md'} fixed>
      <TextField
        label="Script Name"
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={script.name}
        onChange={updateScriptName}
        required
      />
      <TextField
        label="Domain"
        helperText="Matching domain for the script. Support Regex"
        fullWidth
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        value={script.domain}
        onChange={updateScriptDomain}
        required
      />
      <Typography className={classes.text} variant="body1">
        Scripts
      </Typography>
      <CodeMirror
        value={script.code}
        options={{
          theme: 'material',
          mode: 'javascript',
          lineNumbers: true,
          matchBrackets: true,
        }}
        onBeforeChange={(_editor, _data, value) => {
          setScript(prevState => ({ ...prevState, code: value }));
        }}
      />
      <div className={classes.buttonGroup}>
        <Button
          className={classes.button}
          variant="outlined"
          color="secondary"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          className={classes.button}
          variant="outlined"
          color="primary"
          onClick={handleAddScript}
        >
          {id ? 'Save' : 'Add'}
        </Button>
      </div>
    </Container>
  );
}

export default EditScript;
