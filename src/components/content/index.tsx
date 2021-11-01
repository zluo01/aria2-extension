import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import styled from '@mui/system/styled';
import React from 'react';

import { PauseJobs, StartJobs } from '../../aria2';
import { ACTIVE_JOB, IJob, PAUSED_JOB } from '../../types';
import { parseBytes } from '../../utils';
import Progress from '../progress';

const JobList = styled(List)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

const Job = styled(ListItem)(() => ({
  height: 60,
}));

const JobTitleSection = styled(ListItem)(() => ({
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  padding: 0,
}));

const JobSubInfoSection = styled(ListItem)(() => ({
  width: '100%',
  display: 'flex',
  flexFlow: 'row wrap',
  justifyContent: 'space-between',
  padding: 0,
}));

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

async function jobAction(job: IJob) {
  switch (job.status) {
    case ACTIVE_JOB:
      await PauseJobs(job.gid);
      break;
    case PAUSED_JOB:
      await StartJobs(job.gid);
      break;
    default:
      console.error(`Invalid job status ${job.status}`);
      break;
  }
}

function DownloadList({ jobs, checked, toggle }: IDownloadList): JSX.Element {
  return (
    <JobList dense={true}>
      {jobs.map(o => {
        const labelId = `checkbox-list-label-${o.gid}`;
        return (
          <Job key={o.gid} dense onClick={toggle(o.gid)}>
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
                <JobTitleSection>
                  <Typography
                    component="span"
                    variant="body2"
                    display={'inline'}
                    color="textPrimary"
                  >
                    {getFileName(o)}
                  </Typography>
                </JobTitleSection>
              }
              secondary={
                <React.Fragment>
                  <JobSubInfoSection>
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
                  </JobSubInfoSection>
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
          </Job>
        );
      })}
    </JobList>
  );
}

export default DownloadList;
