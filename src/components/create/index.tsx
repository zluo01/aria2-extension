import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { augmentDownloadLink } from '@/lib/magnet';
import { addUris } from '@/lib/queries';

interface ICreationArea {
	close: () => void;
}

function CreationArea({ close }: ICreationArea) {
	const [text, setText] = useState('');

	async function handleSubmit() {
		const uris = text
			.split('\n')
			.map(augmentDownloadLink)
			.filter((o) => o.length > 0);
		await addUris(...uris);
		setText('');
		close();
	}

	return (
		<div className="w-full grid gap-1 py-1 px-2">
			<Textarea
				className="min-h-32"
				placeholder="Support multiple URLS, one URL per line"
				value={text}
				onChange={(e) => setText(e.target.value)}
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
