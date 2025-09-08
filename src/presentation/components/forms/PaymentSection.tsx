import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { ReceiptPayment } from '@/core/domain/entities/Receipt';

interface PaymentSectionProps {
  payments: ReceiptPayment[];
  onChange: (payments: ReceiptPayment[]) => void;
  totalAmount: number;
  error?: string;
}

interface PaymentFormData {
  method: 'cash' | 'card' | 'check' | 'transfer' | 'partial';
  amount: number;
  date: string;
  reference: string;
  notes: string;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  payments,
  onChange,
  totalAmount,
  error,
}) => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ReceiptPayment | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    method: 'cash',
    amount: 0,
    date: new Date().toISOString().slice(0, 16),
    reference: '',
    notes: '',
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = totalAmount - totalPaid;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    check: 'Cheque',
    transfer: 'Transferencia',
    partial: 'Pago Parcial',
  };

  const resetPaymentForm = (): void => {
    setPaymentFormData({
      method: 'cash',
      amount: Math.max(0, remainingBalance),
      date: new Date().toISOString().slice(0, 16),
      reference: '',
      notes: '',
    });
    setPaymentErrors({});
    setEditingPayment(null);
  };

  const openAddPaymentDialog = (): void => {
    resetPaymentForm();
    setShowPaymentDialog(true);
  };

  const openEditPaymentDialog = (payment: ReceiptPayment): void => {
    setPaymentFormData({
      method: payment.method,
      amount: payment.amount,
      date: payment.date.toISOString().slice(0, 16),
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
    setEditingPayment(payment);
    setShowPaymentDialog(true);
  };

  const validatePaymentForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (paymentFormData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    const otherPayments = editingPayment 
      ? payments.filter(p => p.id !== editingPayment.id)
      : payments;
    
    const otherPaymentsTotal = otherPayments.reduce((sum, p) => sum + p.amount, 0);
    const newTotal = otherPaymentsTotal + paymentFormData.amount;

    if (newTotal > totalAmount) {
      newErrors.amount = `El total de pagos no puede exceder $${totalAmount.toFixed(2)}`;
    }

    if (!paymentFormData.date) {
      newErrors.date = 'La fecha es requerida';
    }

    if (paymentFormData.method === 'check' && !paymentFormData.reference.trim()) {
      newErrors.reference = 'El número de cheque es requerido';
    }

    if (paymentFormData.method === 'transfer' && !paymentFormData.reference.trim()) {
      newErrors.reference = 'La referencia de transferencia es requerida';
    }

    setPaymentErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePayment = (): void => {
    if (!validatePaymentForm()) return;

    const newPayment: ReceiptPayment = {
      id: editingPayment?.id || uuidv4(),
      method: paymentFormData.method,
      amount: paymentFormData.amount,
      date: new Date(paymentFormData.date),
      reference: paymentFormData.reference.trim() || undefined,
      notes: paymentFormData.notes.trim() || undefined,
    };

    let updatedPayments: ReceiptPayment[];

    if (editingPayment) {
      updatedPayments = payments.map(payment => 
        payment.id === editingPayment.id ? newPayment : payment
      );
    } else {
      updatedPayments = [...payments, newPayment];
    }

    onChange(updatedPayments);
    setShowPaymentDialog(false);
    resetPaymentForm();
  };

  const handleDeletePayment = (paymentId: string): void => {
    const updatedPayments = payments.filter(payment => payment.id !== paymentId);
    onChange(updatedPayments);
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentStatusColor = (): 'success' | 'warning' | 'error' => {
    if (paymentProgress >= 100) return 'success';
    if (paymentProgress >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Pagos del Recibo</Typography>
        <Button
          variant="contained"
          startIcon={<PaymentIcon />}
          onClick={openAddPaymentDialog}
          size="small"
          disabled={remainingBalance <= 0}
        >
          Agregar Pago
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Payment Summary */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total del Recibo
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalAmount)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Pagado
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(totalPaid)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                Saldo Pendiente
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                color={remainingBalance > 0 ? 'error.main' : 'success.main'}
              >
                {formatCurrency(remainingBalance)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progreso de Pago
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(paymentProgress, 100)}
                color={getPaymentStatusColor()}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {paymentProgress.toFixed(1)}%
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No hay pagos registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Agrega un pago para comenzar
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Método</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Chip
                      label={paymentMethodLabels[payment.method]}
                      size="small"
                      variant="outlined"
                      color={payment.method === 'cash' ? 'success' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(payment.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(payment.date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {payment.reference || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {payment.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => openEditPaymentDialog(payment)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePayment(payment.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Payment Dialog */}
      <Dialog 
        open={showPaymentDialog} 
        onClose={() => setShowPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPayment ? 'Editar Pago' : 'Agregar Pago'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Método de Pago *</InputLabel>
                <Select
                  value={paymentFormData.method}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, method: e.target.value as any }))}
                  label="Método de Pago *"
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monto *"
                type="number"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                error={!!paymentErrors.amount}
                helperText={paymentErrors.amount}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fecha y Hora *"
                type="datetime-local"
                value={paymentFormData.date}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, date: e.target.value }))}
                error={!!paymentErrors.date}
                helperText={paymentErrors.date}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={
                  paymentFormData.method === 'check' 
                    ? 'Número de Cheque *' 
                    : paymentFormData.method === 'transfer' 
                    ? 'Referencia de Transferencia *'
                    : 'Referencia'
                }
                value={paymentFormData.reference}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, reference: e.target.value }))}
                error={!!paymentErrors.reference}
                helperText={paymentErrors.reference}
                placeholder={
                  paymentFormData.method === 'check'
                    ? 'Ej: 001234'
                    : paymentFormData.method === 'transfer'
                    ? 'Ej: TXN123456'
                    : 'Número de referencia (opcional)'
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notas"
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales sobre el pago..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSavePayment}
            disabled={paymentFormData.amount <= 0}
          >
            {editingPayment ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentSection;