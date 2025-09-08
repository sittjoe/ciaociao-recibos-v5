import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Autocomplete,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { ReceiptItem, ReceiptPayment, ReceiptTax } from '@/core/domain/entities/Receipt';
import { Client } from '@/core/domain/entities/Client';
import ClientFormDialog from './ClientFormDialog';
import ReceiptItemsSection from './ReceiptItemsSection';
import PaymentSection from './PaymentSection';

interface ReceiptFormData {
  receiptNumber: string;
  clientId: string;
  client: Client | null;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
  tax: ReceiptTax;
  notes: string;
  status: 'draft' | 'completed' | 'cancelled';
}

interface ReceiptFormProps {
  onSubmit: (formData: ReceiptFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ReceiptFormData>;
  clients: Client[];
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const ReceiptForm: React.FC<ReceiptFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  clients,
  isLoading = false,
  mode = 'create',
}) => {
  const [formData, setFormData] = useState<ReceiptFormData>({
    receiptNumber: generateReceiptNumber(),
    clientId: '',
    client: null,
    items: [],
    payments: [],
    tax: { label: 'IVA', rate: 0.16, amount: 0 },
    notes: '',
    status: 'draft',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.payments, formData.tax]);

  function generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REC-${year}${month}${day}-${random}`;
  }

  function calculateTotals(): void {
    const newSubtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = newSubtotal * formData.tax.rate;
    const newTotal = newSubtotal + taxAmount;
    const newTotalPaid = formData.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const newRemainingBalance = newTotal - newTotalPaid;

    setSubtotal(newSubtotal);
    setTotal(newTotal);
    setTotalPaid(newTotalPaid);
    setRemainingBalance(newRemainingBalance);

    setFormData(prev => ({
      ...prev,
      tax: { ...prev.tax, amount: taxAmount },
    }));
  }

  const handleClientSelect = (client: Client | null): void => {
    setFormData(prev => ({
      ...prev,
      clientId: client?.id || '',
      client,
    }));
    setErrors(prev => ({ ...prev, client: '' }));
  };

  const handleItemsChange = (items: ReceiptItem[]): void => {
    setFormData(prev => ({ ...prev, items }));
  };

  const handlePaymentsChange = (payments: ReceiptPayment[]): void => {
    setFormData(prev => ({ ...prev, payments }));
  };

  const handleTaxChange = (field: keyof ReceiptTax, value: string | number): void => {
    setFormData(prev => ({
      ...prev,
      tax: { ...prev.tax, [field]: value },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.receiptNumber.trim()) {
      newErrors.receiptNumber = 'El número de recibo es requerido';
    }

    if (!formData.clientId) {
      newErrors.client = 'Debe seleccionar un cliente';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Debe agregar al menos un artículo';
    }

    if (formData.status === 'completed' && remainingBalance > 0) {
      newErrors.payment = 'El recibo debe estar completamente pagado para marcarlo como completado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting receipt:', error);
    }
  };

  const handleAddNewClient = (newClient: Client): void => {
    setFormData(prev => ({
      ...prev,
      clientId: newClient.id,
      client: newClient,
    }));
    setShowClientDialog(false);
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            {mode === 'create' ? 'Nuevo Recibo' : 'Editar Recibo'}
          </Typography>
          <Chip
            label={formData.status === 'draft' ? 'Borrador' : 'Completado'}
            color={formData.status === 'draft' ? 'warning' : 'success'}
            variant="outlined"
          />
        </Box>

        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Por favor corrige los errores antes de continuar
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Receipt Header */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Número de Recibo"
              value={formData.receiptNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
              error={!!errors.receiptNumber}
              helperText={errors.receiptNumber}
              disabled={mode === 'edit'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} alignItems="flex-start">
              <Autocomplete
                fullWidth
                options={clients}
                getOptionLabel={(option) => option.getDisplayName()}
                value={formData.client}
                onChange={(_, value) => handleClientSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente"
                    error={!!errors.client}
                    helperText={errors.client}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.getDisplayName()}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.getPrimaryContact()}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
              <Button
                variant="outlined"
                onClick={() => setShowClientDialog(true)}
                sx={{ minWidth: 'auto', px: 1.5 }}
              >
                <AddIcon />
              </Button>
            </Box>
          </Grid>

          {/* Items Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <ReceiptItemsSection
              items={formData.items}
              onChange={handleItemsChange}
              error={errors.items}
            />
          </Grid>

          {/* Tax Configuration */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Impuestos
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descripción del Impuesto"
                      value={formData.tax.label}
                      onChange={(e) => handleTaxChange('label', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Tasa (%)"
                      type="number"
                      value={formData.tax.rate * 100}
                      onChange={(e) => handleTaxChange('rate', parseFloat(e.target.value) / 100)}
                      InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Monto de Impuesto"
                      value={`$${formData.tax.amount.toFixed(2)}`}
                      disabled
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Totals Summary */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen de Totales
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal:</Typography>
                  <Typography fontWeight="bold">${subtotal.toFixed(2)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>{formData.tax.label}:</Typography>
                  <Typography fontWeight="bold">${formData.tax.amount.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    ${total.toFixed(2)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Total Pagado:</Typography>
                  <Typography color={totalPaid > 0 ? 'success.main' : 'text.secondary'}>
                    ${totalPaid.toFixed(2)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography>Saldo Pendiente:</Typography>
                  <Typography 
                    fontWeight="bold"
                    color={remainingBalance > 0 ? 'error.main' : 'success.main'}
                  >
                    ${remainingBalance.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Section */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <PaymentSection
              payments={formData.payments}
              onChange={handlePaymentsChange}
              totalAmount={total}
              error={errors.payment}
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notas Adicionales"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Agregar notas o comentarios sobre el recibo..."
            />
          </Grid>

          {/* Status Selection */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Estado del Recibo</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                label="Estado del Recibo"
              >
                <MenuItem value="draft">Borrador</MenuItem>
                <MenuItem value="completed" disabled={remainingBalance > 0}>
                  Completado
                </MenuItem>
                <MenuItem value="cancelled">Cancelado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={formData.items.length === 0}
          >
            Vista Previa
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : mode === 'create' ? 'Crear Recibo' : 'Actualizar Recibo'}
          </Button>
        </Box>
      </Paper>

      <ClientFormDialog
        open={showClientDialog}
        onClose={() => setShowClientDialog(false)}
        onSubmit={handleAddNewClient}
      />
    </Box>
  );
};

export default ReceiptForm;