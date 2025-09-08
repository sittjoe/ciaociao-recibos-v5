import React from 'react';
import { Typography, Box } from '@mui/material';

const Calculator: React.FC = () => {
  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Jewelry Calculator
      </Typography>
      <Typography variant='body1'>
        Pricing and weight calculator coming soon...
      </Typography>
    </Box>
  );
};

export default Calculator;