import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Client, ClientContact, ClientAddress } from '@/core/domain/entities/Client';

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (client: Client) => void;
  initialData?: Client;
}

interface ClientFormData {
  firstName: string;
  lastName: string;
  companyName: string;
  isCompany: boolean;
  email: string;
  phone: string;
  mobile: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

const ClientFormDialog: React.FC<ClientFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    companyName: initialData?.companyName || '',
    isCompany: initialData?.isCompany || false,
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    mobile: initialData?.contact?.mobile || '',
    street: initialData?.address?.street || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
    postalCode: initialData?.address?.postalCode || '',
    country: initialData?.address?.country || 'México',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = (): void => {
    setFormData({
      firstName: '',
      lastName: '',
      companyName: '',
      isCompany: false,
      email: '',
      phone: '',
      mobile: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'México',
      notes: '',
    });
    setErrors({});
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.isCompany) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'El nombre de la empresa es requerido';
      }
    } else {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'El nombre es requerido';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'El apellido es requerido';
      }
    }

    if (!formData.email && !formData.phone && !formData.mobile) {
      newErrors.contact = 'Debe proporcionar al menos un método de contacto (email o teléfono)';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'El formato del teléfono no es válido';
    }

    if (formData.mobile && !isValidPhone(formData.mobile)) {
      newErrors.mobile = 'El formato del móvil no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleSubmit = (): void => {
    if (!validateForm()) return;

    const contact: ClientContact = {
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      mobile: formData.mobile.trim() || undefined,
    };

    const address: ClientAddress | undefined = (
      formData.street.trim() || 
      formData.city.trim() || 
      formData.state.trim() || 
      formData.postalCode.trim()
    ) ? {
      street: formData.street.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim() || 'México',
    } : undefined;

    let newClient: Client;

    if (initialData) {
      // Update existing client
      newClient = initialData;
      newClient.firstName = formData.firstName.trim();
      newClient.lastName = formData.lastName.trim();
      newClient.companyName = formData.companyName.trim() || undefined;
      newClient.isCompany = formData.isCompany;
      newClient.updateContact(contact);
      if (address) {
        newClient.updateAddress(address);
      }
      newClient.notes = formData.notes.trim() || undefined;
    } else {
      // Create new client
      newClient = new Client(
        formData.firstName.trim(),
        formData.lastName.trim(),
        contact,
        formData.isCompany,
        formData.companyName.trim() || undefined
      );

      if (address) {
        newClient.updateAddress(address);
      }

      if (formData.notes.trim()) {
        newClient.notes = formData.notes.trim();
      }
    }

    onSubmit(newClient);
    handleClose();
  };

  const handleFieldChange = (field: keyof ClientFormData, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {initialData ? 'Editar Cliente' : 'Nuevo Cliente'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {errors.contact && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.contact}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Company Toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isCompany}
                    onChange={(e) => handleFieldChange('isCompany', e.target.checked)}
                  />
                }
                label="Es una empresa"
              />
            </Grid>

            {/* Name Fields */}
            {formData.isCompany ? (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de la Empresa *"
                  value={formData.companyName}
                  onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  error={!!errors.companyName}
                  helperText={errors.companyName}
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nombre *"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Apellidos *"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  Información de Contacto
                </Typography>
              </Divider>
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                placeholder="cliente@ejemplo.com"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
                placeholder="55-1234-5678"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Móvil"
                value={formData.mobile}
                onChange={(e) => handleFieldChange('mobile', e.target.value)}
                error={!!errors.mobile}
                helperText={errors.mobile}
                placeholder="55-9876-5432"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  Dirección (Opcional)
                </Typography>
              </Divider>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Calle y Número"
                value={formData.street}
                onChange={(e) => handleFieldChange('street', e.target.value)}
                placeholder="Av. Ejemplo #123, Col. Centro"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="Ciudad de México"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Estado"
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                placeholder="CDMX"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código Postal"
                value={formData.postalCode}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                placeholder="12345"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="País"
                value={formData.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas"
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre el cliente..."
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={
            formData.isCompany 
              ? !formData.companyName.trim()
              : !formData.firstName.trim() || !formData.lastName.trim()
          }
        >
          {initialData ? 'Actualizar' : 'Crear Cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientFormDialog;