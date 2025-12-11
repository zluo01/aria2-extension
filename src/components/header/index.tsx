import { PauseJobs, RemoveJobs, StartJobs } from '@/aria2';
import { openDetail, openSetting } from '@/browser';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ACTIVE_JOB, IJob, PAUSED_JOB } from '@/types';
import { CheckedState } from '@radix-ui/react-checkbox';
import {
  EllipsisVerticalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
} from 'lucide-react';
import { useState } from 'react';

interface IHeader {
  jobs: IJob[];
  checked: string[];
  show: boolean;
  setShow: () => void;
  setCheck: (value: string[]) => void;
}

function Header({ jobs, checked, show, setShow, setCheck }: IHeader) {
  const disabled = checked.length === 1;

  const [isChecked, setIsChecked] = useState<CheckedState>(false);

  function reset() {
    setCheck(['']);
    setIsChecked(false);
  }

  async function start(): Promise<void> {
    const gid = checked.filter(o => o);
    const context = jobs
      .filter(o => gid.includes(o.gid) && o.status === PAUSED_JOB)
      .map(o => o.gid);
    await StartJobs(...context);
    reset();
  }

  async function pause(): Promise<void> {
    const gid = checked.filter(o => o);
    const context = jobs
      .filter(o => gid.includes(o.gid) && o.status === ACTIVE_JOB)
      .map(o => o.gid);
    await PauseJobs(...context);
    reset();
  }

  async function remove(): Promise<void> {
    const gid = checked.filter(o => o);
    await RemoveJobs(...gid);
    reset();
  }

  function handleChange(check: CheckedState) {
    setIsChecked(check);
    if (!check) {
      setCheck(['']);
    } else {
      setCheck([''].concat(jobs.map(o => o.gid)));
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
          onClick={() => openSetting()}
        >
          <SettingsIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => openDetail(true)}
        >
          <EllipsisVerticalIcon />
        </Button>
      </div>
    </div>
  );
}

export default Header;
