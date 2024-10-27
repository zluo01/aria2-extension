import { useGetConfigurationQuery } from '@/lib/queries';
import { Theme } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useState } from 'react';

import { Theme as ThemeOptions } from '../types';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function usePreferTheme() {
  const { data: config } = useGetConfigurationQuery();

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [theme, setTheme] = useState<Theme>(lightTheme);

  useEffect(() => {
    if (config) {
      switch (config.theme) {
        case ThemeOptions.DARK:
          setTheme(darkTheme);
          break;
        case ThemeOptions.LIGHT:
          setTheme(lightTheme);
          break;
        case ThemeOptions.FOLLOWING_SYSTEM:
          setTheme(prefersDarkMode ? darkTheme : lightTheme);
          break;
      }
    }
  }, [prefersDarkMode, config]);

  return theme;
}

export default usePreferTheme;
