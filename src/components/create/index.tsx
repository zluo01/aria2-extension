import { notify } from '@/browser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { augmentDownloadLink } from '@/lib/magnet';
import { useSubmitTasksMutation } from '@/lib/queries';
import { useState } from 'react';

interface ICreationArea {
  close: () => void;
}

function CreationArea({ close }: ICreationArea) {
  const mutation = useSubmitTasksMutation();

  const [text, setText] = useState('');

  async function handleSubmit() {
    try {
      mutation.mutate(text.split('\n').map(o => augmentDownloadLink(o)));
    } catch (e) {
      if (e instanceof Error) {
        await notify(`fail to download files, msg: ${e.message}.`);
      }
    }
    setText('');
    close();
  }

  return (
    <div className="w-full grid gap-1 py-1 px-2">
      <Textarea
        className="min-h-32"
        placeholder="Support multiple URLS, one URL per line"
        value={text}
        onChange={e => setText(e.target.value)}
        autoFocus
      />
      <Button
        variant="ghost"
        disabled={text.length === 0}
        onClick={handleSubmit}
      >
        Submit
      </Button>
    </div>
  );
}

export default CreationArea;
