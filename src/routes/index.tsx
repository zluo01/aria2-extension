import DownloadList from '@/components/content';
import CreationArea from '@/components/create';
import Header from '@/components/header';
import { getTasksQueryOptions } from '@/lib/queries';
import Container from '@mui/material/Container';
import { styled } from '@mui/material/styles';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getTasksQueryOptions),
  component: Display,
});

const DisplayHolder = styled(Container)(({ theme }) => ({
  width: '100%',
  minWidth: 360,
  maxWidth: 420,
  backgroundColor: theme.palette.background.paper,
}));

function Display() {
  const { data: jobs } = useSuspenseQuery(getTasksQueryOptions);

  const [checked, setChecked] = useState(['']);
  const [show, setShow] = useState(false);

  const handleToggle = (value: string) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  return (
    <DisplayHolder maxWidth={false} disableGutters>
      <Header
        jobs={jobs || []}
        checked={checked}
        show={show}
        setShow={() => setShow(prevState => !prevState)}
        setCheck={setChecked}
      />
      {show ? (
        <CreationArea close={() => setShow(false)} />
      ) : (
        <DownloadList
          jobs={jobs || []}
          checked={checked}
          toggle={handleToggle}
        />
      )}
    </DisplayHolder>
  );
}
