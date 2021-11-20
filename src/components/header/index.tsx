import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import React from 'react';

import { PauseJobs, RemoveJobs, StartJobs } from '../../aria2';
import { openDetail, openSetting } from '../../browser';
import { ACTIVE_JOB, IJob, PAUSED_JOB } from '../../types';

interface IHeader {
  jobs: IJob[];
  checked: string[];
  show: boolean;
  setShow: () => void;
  setCheck: (value: string[]) => void;
}

const ActionGroup = styled('div')(({ theme }) => ({
  paddingLeft: 3,
  display: 'flex',
  flexFlow: 'row nowrap',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: theme.palette.background.default,
}));

function Header({
  jobs,
  checked,
  show,
  setShow,
  setCheck,
}: IHeader): JSX.Element {
  const disabled = checked.length === 1;

  const [isChecked, setIsChecked] = React.useState(false);

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

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setIsChecked(event.target.checked);
    if (!event.target.checked) {
      setCheck(['']);
    } else {
      setCheck([''].concat(jobs.map(o => o.gid)));
    }
  }

  return (
    <ActionGroup>
      <Checkbox
        size={'small'}
        disabled={show}
        checked={isChecked}
        onChange={handleChange}
      />
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1}
      >
        <IconButton size="small" onClick={() => setShow()}>
          <AddIcon />
        </IconButton>
        <IconButton size="small" disabled={disabled} onClick={() => start()}>
          <PlayArrowIcon />
        </IconButton>
        <IconButton size="small" disabled={disabled} onClick={() => pause()}>
          <PauseIcon />
        </IconButton>
        <IconButton size="small" disabled={disabled} onClick={() => remove()}>
          <DeleteIcon />
        </IconButton>
        <IconButton size="small" onClick={() => openSetting()}>
          <SettingsIcon />
        </IconButton>
        <IconButton size="small" onClick={() => openDetail(true)}>
          <MoreVertIcon />
        </IconButton>
      </Stack>
    </ActionGroup>
  );
}

export default Header;
