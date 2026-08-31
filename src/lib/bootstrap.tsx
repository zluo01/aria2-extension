import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { queryClient } from '@/lib/queries';
import { ThemeProvider } from '@/lib/theme';

import '@/index.css';

export function renderPage(page: ReactNode): void {
	const rootElement = document.getElementById('root');
	if (rootElement && !rootElement.innerHTML) {
		ReactDOM.createRoot(rootElement).render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<ThemeProvider defaultTheme="system">{page}</ThemeProvider>
				</QueryClientProvider>
			</StrictMode>,
		);
	}
}
