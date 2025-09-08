import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Fab,
  Dialog,
  DialogContent,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { Add as AddIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { Client } from '@/core/domain/entities/Client';
import { Receipt } from '@/core/domain/entities/Receipt';
import ReceiptForm from '@/presentation/components/forms/ReceiptForm';

interface ReceiptFormData {
  receiptNumber: string;
  clientId: string;
  client: Client | null;
  items: any[];
  payments: any[];
  tax: any;
  notes: string;
  status: 'draft' | 'completed' | 'cancelled';
}

const Receipts: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Load sample clients for development
      const sampleClients = [
        new Client('Juan', 'Pérez', { email: 'juan@ejemplo.com', phone: '55-1234-5678' }),
        new Client('María', 'González', { email: 'maria@ejemplo.com', phone: '55-9876-5432' }),
        new Client('Carlos', 'López', { email: 'carlos@empresa.com', phone: '55-1111-2222' }, true, 'Joyería López'),
      ];
      setClients(sampleClients);

      // TODO: Load receipts from repository when connected
      setReceipts([]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      showNotification('Error al cargar los datos iniciales', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info'): void => {
    setNotification({ open: true, message, severity });
  };

  const handleCreateReceipt = async (formData: ReceiptFormData): Promise<void> => {
    if (!formData.client) {
      throw new Error('Cliente requerido');
    }

    setIsLoading(true);
    try {
      // Create new receipt
      const newReceipt = new Receipt(
        formData.receiptNumber,
        formData.clientId,
        formData.items,
        formData.tax
      );

      // Add payments
      formData.payments.forEach(payment => {
        newReceipt.addPayment(payment);
      });

      // Set notes and status
      if (formData.notes) {
        newReceipt.notes = formData.notes;
      }

      // Update status if completed and fully paid
      if (formData.status === 'completed' && newReceipt.isFullyPaid()) {
        newReceipt.markAsCompleted();
      } else if (formData.status === 'cancelled') {
        newReceipt.cancel();
      }

      // TODO: Save to repository when connected
      // await createReceiptUseCase.execute({ receipt: newReceipt });

      // For now, just add to local state
      setReceipts(prev => [newReceipt, ...prev]);

      setShowCreateForm(false);
      showNotification('Recibo creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating receipt:', error);
      showNotification(`Error al crear recibo: ${error}`, 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseForm = (): void => {
    setShowCreateForm(false);
  };

  const handleCloseNotification = (): void => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  if (isLoading && receipts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestión de Recibos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Crear y administrar recibos de venta para tu joyería
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateForm(true)}
          size="large"
        >
          Nuevo Recibo
        </Button>
      </Box>

      {/* Receipts List */}
      {receipts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay recibos creados
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Crea tu primer recibo para comenzar a gestionar las ventas de tu joyería
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateForm(true)}
            >
              Crear Primer Recibo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {receipts.map((receipt) => (
            <Grid item xs={12} md={6} lg={4} key={receipt.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {receipt.receiptNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Cliente ID: {receipt.clientId}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ${receipt.total.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {receipt.items.length} artículo{receipt.items.length !== 1 ? 's' : ''}
                  </Typography>
                  <Box mt={2}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: receipt.status === 'completed' ? 'success.light' : 'warning.light',
                        color: receipt.status === 'completed' ? 'success.dark' : 'warning.dark',
                      }}
                    >
                      {receipt.status === 'completed' ? 'Completado' : 
                       receipt.status === 'cancelled' ? 'Cancelado' : 'Borrador'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add receipt"
        sx={{ position: 'fixed', bottom: 16, right: 16, display: { sm: 'none' } }}
        onClick={() => setShowCreateForm(true)}
      >
        <AddIcon />
      </Fab>

      {/* Create Receipt Dialog */}
      <Dialog 
        open={showCreateForm} 
        onClose={handleCloseForm}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogContent sx={{ p: 0 }}>
          <ReceiptForm
            onSubmit={handleCreateReceipt}
            onCancel={handleCloseForm}
            clients={clients}
            isLoading={isLoading}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop open={isLoading} sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Receipts;