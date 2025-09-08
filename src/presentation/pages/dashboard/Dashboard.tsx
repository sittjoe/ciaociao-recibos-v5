import React from 'react';
import { Typography, Paper, Grid, Box } from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Recent Receipts
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Coming soon...
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Recent Quotations
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Coming soon...
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;