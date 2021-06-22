import { Button, TextareaAutosize } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { useState } from 'react';

import { AddUris } from '../../aria2';
import { notify } from '../../browser';
import { applyScripts } from '../../utils';

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
    try {
      const uris = await applyScripts(...text.split('\n'));
      await AddUris(...uris);
    } catch (e) {
      await notify(`fail to download files, msg: ${e.message || e}.`);
    }
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
