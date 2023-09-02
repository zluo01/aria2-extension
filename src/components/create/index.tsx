import Button from '@mui/material/Button';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import { styled } from '@mui/material/styles';
import { notify } from '@src/browser';
import { useSubmitTasksTrigger } from '@src/lib/queries';
import { applyScripts } from '@src/utils';
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
      const uris = await applyScripts(...text.split('\n'));
      await trigger(uris);
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
