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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { ReceiptItem } from '@/core/domain/entities/Receipt';

interface ReceiptItemsSectionProps {
  items: ReceiptItem[];
  onChange: (items: ReceiptItem[]) => void;
  error?: string;
}

interface ItemFormData {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  weight?: number;
  material?: string;
  karat?: number;
}

const ReceiptItemsSection: React.FC<ReceiptItemsSectionProps> = ({
  items,
  onChange,
  error,
}) => {
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
  const [itemFormData, setItemFormData] = useState<ItemFormData>({
    productId: '',
    description: '',
    quantity: 1,
    unitPrice: 100, // Set a default price so button isn't disabled
    weight: undefined,
    material: '',
    karat: undefined,
  });
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const resetItemForm = (): void => {
    setItemFormData({
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 100, // Set a default price
      weight: undefined,
      material: '',
      karat: undefined,
    });
    setItemErrors({});
    setEditingItem(null);
  };

  const openAddItemDialog = (): void => {
    resetItemForm();
    setShowItemDialog(true);
  };

  const openEditItemDialog = (item: ReceiptItem): void => {
    setItemFormData({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      weight: item.weight,
      material: item.material || '',
      karat: item.karat,
    });
    setEditingItem(item);
    setShowItemDialog(true);
  };

  const validateItemForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!itemFormData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    if (itemFormData.quantity <= 0) {
      newErrors.quantity = 'La cantidad debe ser mayor a 0';
    }

    if (itemFormData.unitPrice < 0) {
      newErrors.unitPrice = 'El precio unitario no puede ser negativo';
    }

    // Simplify validations - make weight and karat optional with no restrictions
    // if (itemFormData.weight && itemFormData.weight <= 0) {
    //   newErrors.weight = 'El peso debe ser mayor a 0';
    // }

    // if (itemFormData.karat && (itemFormData.karat < 1 || itemFormData.karat > 24)) {
    //   newErrors.karat = 'Los quilates deben estar entre 1 y 24';
    // }

    setItemErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveItem = (): void => {
    if (!validateItemForm()) return;

    const totalPrice = itemFormData.quantity * itemFormData.unitPrice;

    const newItem: ReceiptItem = {
      id: editingItem?.id || uuidv4(),
      productId: itemFormData.productId || uuidv4(),
      description: itemFormData.description,
      quantity: itemFormData.quantity,
      unitPrice: itemFormData.unitPrice,
      totalPrice,
      weight: itemFormData.weight,
      material: itemFormData.material || undefined,
      karat: itemFormData.karat,
    };

    let updatedItems: ReceiptItem[];

    if (editingItem) {
      updatedItems = items.map(item => 
        item.id === editingItem.id ? newItem : item
      );
    } else {
      updatedItems = [...items, newItem];
    }

    onChange(updatedItems);
    setShowItemDialog(false);
    resetItemForm();
  };

  const handleDeleteItem = (itemId: string): void => {
    const updatedItems = items.filter(item => item.id !== itemId);
    onChange(updatedItems);
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getTotalAmount = (): number => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Artículos del Recibo</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAddItemDialog}
          size="small"
        >
          Agregar Artículo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {items.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No hay artículos agregados al recibo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Haz clic en "Agregar Artículo" para comenzar
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descripción</TableCell>
                <TableCell align="center">Cantidad</TableCell>
                <TableCell align="right">Precio Unit.</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center">Detalles</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.description}
                    </Typography>
                    {item.productId && item.productId !== item.id && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {item.productId}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.quantity}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(item.unitPrice)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(item.totalPrice)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      {item.material && (
                        <Chip
                          label={item.material}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      )}
                      {item.karat && (
                        <Chip
                          label={`${item.karat}k`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                      {item.weight && (
                        <Typography variant="caption" color="text.secondary">
                          {item.weight}g
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => openEditItemDialog(item)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteItem(item.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {items.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="h6" fontWeight="bold">
                      Subtotal
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(getTotalAmount())}
                    </Typography>
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog 
        open={showItemDialog} 
        onClose={() => setShowItemDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingItem ? 'Editar Artículo' : 'Agregar Artículo'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción del Artículo *"
                value={itemFormData.description}
                onChange={(e) => setItemFormData(prev => ({ ...prev, description: e.target.value }))}
                error={!!itemErrors.description}
                helperText={itemErrors.description}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código/ID del Producto"
                value={itemFormData.productId}
                onChange={(e) => setItemFormData(prev => ({ ...prev, productId: e.target.value }))}
                placeholder="Opcional"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Material"
                value={itemFormData.material}
                onChange={(e) => setItemFormData(prev => ({ ...prev, material: e.target.value }))}
                placeholder="Ej: Oro, Plata, Acero"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Cantidad *"
                type="number"
                value={itemFormData.quantity}
                onChange={(e) => setItemFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                error={!!itemErrors.quantity}
                helperText={itemErrors.quantity}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Precio Unitario *"
                type="number"
                value={itemFormData.unitPrice}
                onChange={(e) => setItemFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                error={!!itemErrors.unitPrice}
                helperText={itemErrors.unitPrice}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Total"
                value={formatCurrency(itemFormData.quantity * itemFormData.unitPrice)}
                disabled
                helperText="Calculado automáticamente"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Peso (gramos)"
                type="number"
                value={itemFormData.weight || ''}
                onChange={(e) => setItemFormData(prev => ({ 
                  ...prev, 
                  weight: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
                error={!!itemErrors.weight}
                helperText={itemErrors.weight || 'Opcional para joyería'}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quilates"
                type="number"
                value={itemFormData.karat || ''}
                onChange={(e) => setItemFormData(prev => ({ 
                  ...prev, 
                  karat: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                error={!!itemErrors.karat}
                helperText={itemErrors.karat || 'Para metales preciosos (1-24)'}
                InputProps={{ inputProps: { min: 1, max: 24, step: 1 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowItemDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveItem}
            disabled={!itemFormData.description.trim()}
          >
            {editingItem ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReceiptItemsSection;