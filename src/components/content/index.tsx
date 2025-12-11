import { PauseJobs, StartJobs } from '@/aria2';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ACTIVE_JOB, IJob, PAUSED_JOB } from '@/types';
import { parseBytes } from '@/utils';
import { PauseIcon, PlayIcon } from 'lucide-react';

interface IDownloadList {
  jobs: IJob[];
  checked: string[];
  toggle: (value: string) => () => void;
}

function DownloadList({ jobs, checked, toggle }: IDownloadList) {
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

  return (
    <div className="flex flex-col items-center justify-center w-full py-1 px-2 gap-y-1">
      {jobs.map(o => {
        const progress = getProgress(o);
        return (
          <div
            key={o.gid}
            className="flex flex-row items-center justify-between w-full h-16"
            onClick={toggle(o.gid)}
          >
            <Checkbox
              className="ml-2"
              checked={checked.indexOf(o.gid) !== -1}
              tabIndex={-1}
            />
            <div className="flex flex-row flex-nowrap items-center justify-end gap-x-2 w-4/5">
              <div className="flex flex-col w-full flex-nowrap justify-around py-1 truncate">
                <span>{getFileName(o)}</span>
                <div className="w-full flex flex-row flex-nowrap justify-between text-muted-foreground text-sm">
                  <span>{parseBytes(parseFloat(o.totalLength))}</span>
                  <span>{parseBytes(parseFloat(o.downloadSpeed)) + '\\s'}</span>
                </div>
                <div className="w-full flex flex-row flex-nowrap justify-end items-center">
                  <Progress value={progress} className="mr-1 h-1 w-full" />
                  <span className="min-w-9 text-muted-foreground text-sm">{`${progress.toFixed(1)}%`}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full z-10"
                onClick={() => jobAction(o)}
              >
                {o.status === ACTIVE_JOB ? <PauseIcon /> : <PlayIcon />}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DownloadList;
