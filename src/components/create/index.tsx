import { notify } from '@/browser';
import { augmentDownloadLink } from '@/lib/magnet';
import { useSubmitTasksTrigger } from '@/lib/queries';
import Button from '@mui/material/Button';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import { styled } from '@mui/material/styles';
import { useState } from 'react';

const CreationSection = styled('div')(({ theme }) => ({
  width: 420,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  flexFlow: 'column nowrap',
}));

interface ICreationArea {
  close: () => void;
}

function CreationArea({ close }: ICreationArea): JSX.Element {
  const { trigger } = useSubmitTasksTrigger();

  const [text, setText] = useState('');

  async function handleSubmit() {
    try {
      await trigger(text.split('\n').map(o => augmentDownloadLink(o)));
    } catch (e) {
      if (e instanceof Error) {
        await notify(`fail to download files, msg: ${e.message}.`);
      }
    }
    setText('');
    close();
  }

  return (
    <CreationSection>
      <TextareaAutosize
        aria-label="minimum height"
        minRows={6}
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
    </CreationSection>
  );
}

export default CreationArea;
