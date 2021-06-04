import { Checkbox, IconButton } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import SettingsIcon from '@material-ui/icons/Settings';
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '98%',
      minWidth: 360,
      margin: 'auto',
      display: 'flex',
      flexFlow: 'row nowrap',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backgroundColor: theme.palette.background.default,
    },
    margin: {
      margin: theme.spacing(1),
    },
  })
);

function Header({
  jobs,
  checked,
  show,
  setShow,
  setCheck,
}: IHeader): JSX.Element {
  const classes = useStyles();

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
    <div className={classes.root}>
      <Checkbox
        size={'small'}
        disabled={show}
        checked={isChecked}
        onChange={handleChange}
      />
      <div>
        <IconButton
          size="small"
          className={classes.margin}
          onClick={() => setShow()}
        >
          <AddIcon />
        </IconButton>
        <IconButton
          size="small"
          className={classes.margin}
          disabled={disabled}
          onClick={() => start()}
        >
          <PlayArrowIcon />
        </IconButton>
        <IconButton
          size="small"
          className={classes.margin}
          disabled={disabled}
          onClick={() => pause()}
        >
          <PauseIcon />
        </IconButton>
        <IconButton
          size="small"
          className={classes.margin}
          disabled={disabled}
          onClick={() => remove()}
        >
          <DeleteIcon />
        </IconButton>
        <IconButton
          size="small"
          className={classes.margin}
          onClick={() => openSetting()}
        >
          <SettingsIcon />
        </IconButton>
        <IconButton size="small" onClick={() => openDetail(true)}>
          <MoreVertIcon />
        </IconButton>
      </div>
    </div>
  );
}

export default Header;
