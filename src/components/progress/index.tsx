import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

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

const ProgressHolder = styled('div')({
  width: '100%',
});

export default function LinearWithValueLabel({
  value,
}: IProgressWithLabel): JSX.Element {
  return (
    <ProgressHolder>
      <LinearProgressWithLabel value={value} />
    </ProgressHolder>
  );
}
