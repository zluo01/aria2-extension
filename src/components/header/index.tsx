import type { CheckedState } from '@radix-ui/react-checkbox';
import {
	EllipsisVerticalIcon,
	PauseIcon,
	PlayIcon,
	PlusIcon,
	SettingsIcon,
	TrashIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { client } from '@/lib/browser';
import { pauseJobs, removeJobs, startJobs } from '@/lib/queries';
import { ACTIVE_JOB, type IJob, PAUSED_JOB } from '@/types';

interface IHeader {
	jobs: IJob[];
	checked: string[];
	show: boolean;
	setShow: () => void;
	setCheck: (value: string[]) => void;
}

function Header({ jobs, checked, show, setShow, setCheck }: IHeader) {
	const disabled = checked.length === 0;

	const [isChecked, setIsChecked] = useState<CheckedState>(false);

	function reset() {
		setCheck([]);
		setIsChecked(false);
	}

	async function start(): Promise<void> {
		const context = jobs
			.filter((o) => checked.includes(o.gid) && o.status === PAUSED_JOB)
			.map((o) => o.gid);
		await startJobs(...context);
		reset();
	}

	async function pause(): Promise<void> {
		const context = jobs
			.filter((o) => checked.includes(o.gid) && o.status === ACTIVE_JOB)
			.map((o) => o.gid);
		await pauseJobs(...context);
		reset();
	}

	async function remove(): Promise<void> {
		await removeJobs(...checked);
		reset();
	}

	function handleChange(check: CheckedState) {
		setIsChecked(check);
		if (!check) {
			setCheck([]);
		} else {
			setCheck(jobs.map((o) => o.gid));
		}
	}

	return (
		<div className="flex sticky top-0 z-10 flex-nowrap flex-row justify-between items-center pb-1 px-2 pt-2">
			<Checkbox
				className="ml-2"
				checked={isChecked}
				disabled={show}
				onCheckedChange={handleChange}
			/>
			<div className="flex flex-row flex-nowrap justify-end items-center space-x-1">
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					onClick={() => setShow()}
				>
					<PlusIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					disabled={disabled}
					onClick={() => start()}
				>
					<PlayIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					disabled={disabled}
					onClick={() => pause()}
				>
					<PauseIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					disabled={disabled}
					onClick={() => remove()}
				>
					<TrashIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					onClick={() => client.openSetting()}
				>
					<SettingsIcon />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					onClick={() => client.openDetail(true)}
				>
					<EllipsisVerticalIcon />
				</Button>
			</div>
		</div>
	);
}

export default Header;
