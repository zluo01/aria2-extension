import { Button, TextareaAutosize } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { useState } from 'react';

import { AddUri } from '../../aria2';

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

  function handleSubmit() {
    const urls = text.split('\n');
    urls.forEach(o => AddUri(o));
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
