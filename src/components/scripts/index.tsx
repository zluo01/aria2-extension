import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/theme/material.css';
import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { useLocation, useNavigate } from 'react-router-dom';

import { addScript, getScripts } from '../../browser';
import { DEFAULT_SCRIPT, IScript } from '../../types';
import './index.css';

const EditButton = styled(Button)({
  width: 80,
  height: 40,
});

function Scripts(): JSX.Element {
  const navigate = useNavigate();

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
    navigate('/setting');
  }

  async function handleAddScript() {
    await addScript(script, parseInt(id));
    await handleCancel();
  }

  return (
    <Container maxWidth={'md'} fixed>
      <TextField
        label="Script Name"
        InputLabelProps={{
          shrink: true,
        }}
        value={script.name}
        onChange={updateScriptName}
        variant="standard"
        margin="normal"
        fullWidth
        required
      />
      <TextField
        label="Domain"
        helperText="Matching domain for the script. Support Regex"
        InputLabelProps={{
          shrink: true,
        }}
        value={script.domain}
        onChange={updateScriptDomain}
        variant="standard"
        margin="normal"
        fullWidth
        required
      />
      <Typography sx={{ mb: 1 }} variant="body1">
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
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1}
        sx={{ pt: 1 }}
      >
        <EditButton variant="outlined" color="secondary" onClick={handleCancel}>
          Cancel
        </EditButton>
        <EditButton
          variant="outlined"
          color="primary"
          onClick={handleAddScript}
        >
          {id ? 'Save' : 'Add'}
        </EditButton>
      </Stack>
    </Container>
  );
}

export default Scripts;
