import React from 'react';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import {
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
} from '@material-ui/core';
import Progress from '../progress';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

import { ACTIVE_JOB, IJob, PAUSED_JOB } from '../../types';
import { PauseJob, StartJob } from '../../aria2';
import { parseBytes } from '../../utils';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.palette.background.paper,
    },
    item: {
      height: 60,
    },
    primaryText: {
      width: 'inherit',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    subText: {
      width: 'inherit',
      display: 'flex',
      flexFlow: 'row wrap',
      justifyContent: 'space-between',
    },
  })
);

interface IDownloadList {
  jobs: IJob[];
  checked: string[];
  toggle: (value: string) => () => void;
}

function getFileName(job: IJob): string {
  if (job.bittorrent && job.bittorrent.info) {
    return job.bittorrent.info.name;
  }
  const path = job.files[0].path;
  return path.split('/').slice(-1)[0];
}

function getProgress(job: IJob): number {
  const progress =
    parseFloat(job.completedLength) / parseFloat(job.totalLength);
  if (isNaN(progress)) {
    return 0;
  }
  return progress * 100;
}

function jobAction(job: IJob) {
  switch (job.status) {
    case ACTIVE_JOB:
      PauseJob(job.gid).catch(err => console.error(err));
      break;
    case PAUSED_JOB:
      StartJob(job.gid).catch(err => console.error(err));
      break;
    default:
      console.error(`Invalid job status ${job.status}`);
      break;
  }
}

function DownloadList({ jobs, checked, toggle }: IDownloadList): JSX.Element {
  const classes = useStyles();
  return (
    <List className={classes.root} dense={true}>
      {jobs.map(o => {
        const labelId = `checkbox-list-label-${o.gid}`;
        return (
          <ListItem
            key={o.gid}
            className={classes.item}
            dense
            onClick={toggle(o.gid)}
          >
            <ListItemIcon>
              <Checkbox
                edge="start"
                size={'small'}
                checked={checked.indexOf(o.gid) !== -1}
                tabIndex={-1}
                inputProps={{ 'aria-labelledby': labelId }}
              />
            </ListItemIcon>
            <ListItemText
              id={labelId}
              primary={
                <div className={classes.primaryText}>
                  <Typography
                    component="span"
                    variant="body2"
                    display={'inline'}
                    color="textPrimary"
                  >
                    {getFileName(o)}
                  </Typography>
                </div>
              }
              secondary={
                <React.Fragment>
                  <div className={classes.subText}>
                    <Typography
                      component="span"
                      variant="body2"
                      display={'inline'}
                      color="textPrimary"
                    >
                      {parseBytes(o.totalLength)}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      display={'inline'}
                      color="textPrimary"
                    >
                      {parseBytes(o.downloadSpeed) + '\\s'}
                    </Typography>
                  </div>
                  <Progress value={getProgress(o)} />
                </React.Fragment>
              }
            />
            <ListItemSecondaryAction>
              <IconButton
                edge={'end'}
                aria-label={'comments'}
                size={'small'}
                onClick={() => jobAction(o)}
              >
                {o.status === ACTIVE_JOB ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        );
      })}
    </List>
  );
}

export default DownloadList;
