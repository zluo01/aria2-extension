import usePreferTheme from '@/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
});

function RootComponent() {
  const preferTheme = usePreferTheme();

  return (
    <>
      <ThemeProvider theme={preferTheme}>
        <CssBaseline />
        <Outlet />
      </ThemeProvider>
    </>
  );
}
