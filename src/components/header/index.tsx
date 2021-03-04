import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { Checkbox, IconButton } from '@material-ui/core';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import React from 'react';
import DeleteIcon from '@material-ui/icons/Delete';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import AddIcon from '@material-ui/icons/Add';
import { PauseJobs, RemoveJobs, StartJobs } from '../../aria2';
import { ACTIVE_JOB, IJob, PAUSED_JOB } from '../../types';
import { openDetail } from '../../browser';

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

  function start(): void {
    const gid = checked.filter(o => o);
    const context = jobs
      .filter(o => gid.includes(o.gid) && o.status === PAUSED_JOB)
      .map(o => o.gid);
    StartJobs(context)
      .then(() => reset())
      .catch(err => console.error(err));
  }

  function pause() {
    const gid = checked.filter(o => o);
    const context = jobs
      .filter(o => gid.includes(o.gid) && o.status === ACTIVE_JOB)
      .map(o => o.gid);
    PauseJobs(context)
      .then(() => reset())
      .catch(err => console.error(err));
  }

  function remove() {
    const gid = checked.filter(o => o);
    RemoveJobs(gid)
      .then(() => reset())
      .catch(err => console.error(err));
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
        <IconButton size="small" onClick={() => openDetail(true)}>
          <MoreVertIcon />
        </IconButton>
      </div>
    </div>
  );
}

export default Header;
