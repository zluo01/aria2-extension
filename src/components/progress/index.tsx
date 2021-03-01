import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

interface IProgressWithLabel {
  value: number;
}

function LinearProgressWithLabel(props: IProgressWithLabel) {
  return (
    <Box display="flex" alignItems="center">
      <Box width="100%" mr={1}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box minWidth={35}>
        <Typography
          variant="body2"
          color="textSecondary"
        >{`${props.value.toFixed(1)}%`}</Typography>
      </Box>
    </Box>
  );
}

const useStyles = makeStyles({
  root: {
    width: '100%',
  },
});

export default function LinearWithValueLabel({
  value,
}: IProgressWithLabel): JSX.Element {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <LinearProgressWithLabel value={value} />
    </div>
  );
}
