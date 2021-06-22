import { Button, TextareaAutosize } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { useState } from 'react';

import { AddUris } from '../../aria2';
import { getScripts, notify } from '../../browser';
import { applyScript } from '../../utils';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: 420,
      backgroundColor: theme.palette.background.paper,
      display: 'flex',
      flexFlow: 'column nowrap',
    },
  })
);

interface ICreationArea {
  close: () => void;
}

function CreationArea({ close }: ICreationArea): JSX.Element {
  const classes = useStyles();

  const [text, setText] = useState('');

  async function handleSubmit() {
    const uris = text.split('\n');
    const scripts = await getScripts();
    for (let i = 0; i < uris.length; i++) {
      let copyUri = uris[i];
      for (let j = 0; j < scripts.length; j++) {
        if (uris[i].match(scripts[j].domain)) {
          try {
            copyUri = await applyScript(copyUri, scripts[j].code);
          } catch (e) {
            await notify(e);
            setText('');
            close();
            return;
          }
        }
      }
      uris[i] = copyUri;
    }

    await AddUris(...uris);
    setText('');
    close();
  }

  return (
    <div className={classes.root}>
      <TextareaAutosize
        aria-label="minimum height"
        rowsMin={6}
        placeholder="Support multiple URLS, one URL per line"
        value={text}
        onChange={e => setText(e.target.value)}
        autoFocus
      />
      <Button
        variant="contained"
        color="primary"
        disabled={text.length === 0}
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </div>
  );
}

export default CreationArea;
