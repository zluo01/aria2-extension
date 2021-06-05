import { Button, TextareaAutosize } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { useState } from 'react';

import { AddUris } from '../../aria2';
import { getScripts } from '../../browser';

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
    let uris = text.split('\n');
    const scripts = await getScripts();
    uris = uris.map(uri => {
      let copyUri = uri;
      scripts.forEach(o => {
        if (uri.match(o.domain)) {
          let code = 'return ' + o.code;
          code = code.slice(0, -3) + `(url);`;
          // eslint-disable-next-line no-new-func
          const func = new Function('url', code);
          copyUri = func(copyUri);
        }
      });
      return copyUri;
    });

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
