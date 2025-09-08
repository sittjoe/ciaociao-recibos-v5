import type { JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { theme } from '@/presentation/styles/theme';
import MainLayout from '@/presentation/components/layouts/MainLayout';
import Dashboard from '@/presentation/pages/dashboard/Dashboard';
import Receipts from '@/presentation/pages/receipts/Receipts';
import Quotations from '@/presentation/pages/quotations/Quotations';
import Calculator from '@/presentation/pages/calculator/Calculator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Router basename="/ciaociao-recibos-v5">
            <MainLayout>
              <Routes>
                <Route path='/' element={<Navigate to='/dashboard' replace />} />
                <Route path='/dashboard' element={<Dashboard />} />
                <Route path='/receipts' element={<Receipts />} />
                <Route path='/quotations' element={<Quotations />} />
                <Route path='/calculator' element={<Calculator />} />
                <Route path='*' element={<Navigate to='/dashboard' replace />} />
              </Routes>
            </MainLayout>
          </Router>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
