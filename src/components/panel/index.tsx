import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { ChangeEvent, useEffect, useState } from 'react';

import { getJobDetail, saveFile } from '../../browser';
import { useDownloadTrigger } from '../../lib/queries';
import { IFileDetail } from '../../types';
import { verifyFileName } from '../../utils';

const Panel = styled(Stack)(({ theme }) => ({
  width: '98%',
  height: '100%',
  minWidth: 480,
  minHeight: 320,
  marginLeft: 'auto',
  marginRight: 'auto',
  backgroundColor: theme.palette.background.paper,
}));

const PanelButton = styled(Button)({
  width: 130,
});

const initialDetail: IFileDetail = {
  fileName: '',
  fileSize: '',
  header: [],
  url: '',
};

function DownloadPanel(): JSX.Element {
  const { trigger } = useDownloadTrigger();

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
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ): void {
    const name = e.target.value;
    setDetail({ ...detail, fileName: name });
    verifyFileName(name)
      .then(b => isInValid(b))
      .catch(err => console.error(err));
  }

  async function downloadFile(
    url: string,
    fileName: string,
    filePath: string,
    headers: string[],
  ) {
    await trigger({
      url,
      fileName,
      filePath,
      headers,
    });
  }

  return (
    <Panel
      direction="column"
      justifyContent="space-around"
      alignItems="center"
      spacing={1}
    >
      <TextField
        label="File Name"
        error={inValid}
        value={detail.fileName}
        onChange={updateFileName}
        variant="standard"
        margin="dense"
        fullWidth
      />
      <TextField
        required
        label="File Path"
        value={filePath}
        onChange={e => setFilePath(e.target.value)}
        variant="standard"
        margin="dense"
        fullWidth
      />
      <TextField
        label="From"
        value={detail.url}
        variant="standard"
        margin="dense"
        fullWidth
        disabled
      />
      <Typography
        variant="body2"
        component="span"
        color="textSecondary"
        display="inline"
        align="right"
        sx={{ width: 1 }}
      >
        {detail.fileSize}
      </Typography>
      <TextareaAutosize
        minRows={6}
        maxRows={6}
        value={detail.header}
        style={{ width: '100%' }}
      />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        sx={{ pt: 1, width: 1 }}
      >
        <PanelButton
          variant="contained"
          color="primary"
          onClick={() =>
            downloadFile(
              detail.url,
              detail.fileName as string,
              filePath,
              detail.header as string[],
            )
          }
        >
          Download
        </PanelButton>
        <PanelButton
          variant="contained"
          color="primary"
          onClick={() => saveFile(detail.url, detail.fileName as string, false)}
        >
          Save
        </PanelButton>
        <PanelButton
          variant="contained"
          color="primary"
          onClick={() => saveFile(detail.url, detail.fileName as string, true)}
        >
          Save As
        </PanelButton>
      </Stack>
    </Panel>
  );
}

export default DownloadPanel;
