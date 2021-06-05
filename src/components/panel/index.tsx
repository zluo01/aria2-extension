import {
  Button,
  TextareaAutosize,
  TextField,
  Typography,
} from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
import {
  createMuiTheme,
  createStyles,
  makeStyles,
  Theme,
  ThemeProvider,
} from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useEffect, useState, StrictMode, useMemo, ChangeEvent } from 'react';
import ReactDOM from 'react-dom';

import { getJobDetail, download, saveFile } from '../../browser';
import { IFileDetail } from '../../types';
import { verifyFileName } from '../../utils';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '98%',
      height: '100%',
      minWidth: 480,
      minHeight: 320,
      display: 'flex',
      flexFlow: 'column nowrap',
      justifyContent: 'space-between',
      marginLeft: 'auto',
      marginRight: 'auto',
      backgroundColor: theme.palette.background.paper,
    },
    buttonGroup: {
      width: 'inherit',
      display: 'flex',
      flexFlow: 'row nowrap',
      justifyContent: 'space-between',
    },
    button: {
      width: 130,
    },
  })
);

const initialDetail: IFileDetail = {
  fileName: '',
  fileSize: '',
  header: [],
  url: '',
};

function Panel() {
  const classes = useStyles();

  const [detail, setDetail] = useState<IFileDetail>(initialDetail);
  const [inValid, isInValid] = useState(false);
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    getJobDetail()
      .then(detail => {
        setDetail(detail);
        return verifyFileName(detail.fileName as string);
      })
      .then(b => isInValid(b))
      .catch(err => console.error(err));
  }, []);

  function updateFileName(
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ): void {
    const name = e.target.value;
    setDetail({ ...detail, fileName: name });
    verifyFileName(name)
      .then(b => isInValid(b))
      .catch(err => console.error(err));
  }

  return (
    <div className={classes.root}>
      <TextField
        label="File Name"
        error={inValid}
        value={detail.fileName}
        onChange={updateFileName}
      />
      <TextField
        required
        label="File Path"
        value={filePath}
        onChange={e => setFilePath(e.target.value)}
      />
      <TextField label="From" value={detail.url} disabled />
      <Typography
        variant="body2"
        component="span"
        color="textSecondary"
        display="inline"
        align="right"
      >
        {detail.fileSize}
      </Typography>
      <TextareaAutosize rowsMin={6} value={detail.header} />
      <div className={classes.buttonGroup}>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          onClick={() =>
            download(
              detail.url,
              detail.fileName as string,
              filePath,
              detail.header as string[]
            )
          }
        >
          Download
        </Button>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          onClick={() => saveFile(detail.url, detail.fileName as string, false)}
        >
          Save
        </Button>
        <Button
          className={classes.button}
          variant="contained"
          color="primary"
          onClick={() => saveFile(detail.url, detail.fileName as string, true)}
        >
          Save As
        </Button>
      </div>
    </div>
  );
}

function DownloadPanel(): JSX.Element {
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
      <Panel />
    </ThemeProvider>
  );
}

ReactDOM.render(
  <StrictMode>
    <DownloadPanel />
  </StrictMode>,
  document.getElementById('panel')
);
