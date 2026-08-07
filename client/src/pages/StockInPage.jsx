import { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import * as stockApi from '../services/stockApi';
import * as sparePartApi from '../services/sparePartApi';
import * as consumableApi from '../services/consumableApi';
import { getStockMovements } from '../services/stockApi';

const StockInPage = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sparePartsLoading, setSparePartsLoading] = useState(true);
  const [consumablesLoading, setConsumablesLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  const [spareParts, setSpareParts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [movements, setMovements] = useState([]);

  const today = dayjs().format('YYYY-MM-DD');

  const [spareForm, setSpareForm] = useState({
    date: today,
    sparePartId: '',
    quantity: '',
    receivedBy: user?.fullName || '',
    reference: '',
    unitPrice: '',
    remarks: '',
  });

  const [consumableForm, setConsumableForm] = useState({
    date: today,
    consumableId: '',
    quantity: '',
    receivedBy: user?.fullName || '',
    reference: '',
    unitPrice: '',
    remarks: '',
  });

  const selectedSparePart = spareParts.find((p) => p.id === spareForm.sparePartId || p._id === spareForm.sparePartId);
  const selectedConsumable = consumables.find((c) => c.id === consumableForm.consumableId || c._id === consumableForm.consumableId);

  useEffect(() => {
    const fetchSpareParts = async () => {
      try {
        const response = await sparePartApi.getAllSpareParts();
        if (response.success) {
          setSpareParts(Array.isArray(response.data) ? response.data : []);
        } else {
          toast.error(response.message || 'Failed to load spare parts');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load spare parts');
      } finally {
        setSparePartsLoading(false);
      }
    };
    fetchSpareParts();
  }, []);

  useEffect(() => {
    const fetchConsumables = async () => {
      try {
        const response = await consumableApi.getAllConsumables();
        if (response.success) {
          setConsumables(Array.isArray(response.data) ? response.data : []);
        } else {
          toast.error(response.message || 'Failed to load consumables');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load consumables');
      } finally {
        setConsumablesLoading(false);
      }
    };
    fetchConsumables();
  }, []);

  const fetchMovements = async () => {
    setMovementsLoading(true);
    try {
      const response = await getStockMovements({ types: 'stockIn,consumableStockIn', limit: 20 });
      if (response.success) {
        setMovements(Array.isArray(response.data) ? response.data : []);
      } else {
        toast.error(response.message || 'Failed to load movements');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load movements');
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadMovements = async () => {
      setMovementsLoading(true);
      try {
        const response = await getStockMovements({ types: 'stockIn,consumableStockIn', limit: 20 });
        if (mounted && response.success) {
          setMovements(Array.isArray(response.data) ? response.data : []);
        } else if (mounted) {
          toast.error(response.message || 'Failed to load movements');
        }
      } catch (error) {
        if (mounted) toast.error(error.message || 'Failed to load movements');
      } finally {
        if (mounted) setMovementsLoading(false);
      }
    };
    loadMovements();
    return () => { mounted = false; };
  }, []);

  const handleSpareSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(spareForm.quantity);
    if (!spareForm.sparePartId) {
      toast.error('Please select a spare part');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!spareForm.receivedBy.trim()) {
      toast.error('Received By is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: spareForm.date,
        sparePartId: spareForm.sparePartId,
        quantity: qty,
        receivedBy: spareForm.receivedBy,
        reference: spareForm.reference || undefined,
        unitPrice: spareForm.unitPrice ? parseFloat(spareForm.unitPrice) : undefined,
        remarks: spareForm.remarks || undefined,
      };
      const response = await stockApi.sparePartStockIn(payload);
      if (response.success) {
        const newBalance = response.data?.newBalance ?? response.data?.quantity ?? (selectedSparePart?.quantity || 0) + qty;
        toast.success(`Stock In recorded. New balance: ${newBalance}`);
        setSpareForm({
          date: today,
          sparePartId: '',
          quantity: '',
          receivedBy: user?.fullName || '',
          reference: '',
          unitPrice: '',
          remarks: '',
        });
        fetchMovements();
      } else {
        toast.error(response.message || 'Failed to record stock in');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record stock in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConsumableSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(consumableForm.quantity);
    if (!consumableForm.consumableId) {
      toast.error('Please select a consumable');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!consumableForm.receivedBy.trim()) {
      toast.error('Received By is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: consumableForm.date,
        consumableId: consumableForm.consumableId,
        quantity: qty,
        receivedBy: consumableForm.receivedBy,
        reference: consumableForm.reference || undefined,
        unitPrice: consumableForm.unitPrice ? parseFloat(consumableForm.unitPrice) : undefined,
        remarks: consumableForm.remarks || undefined,
      };
      const response = await stockApi.consumableStockIn(payload);
      if (response.success) {
        const newBalance = response.data?.newBalance ?? response.data?.quantity ?? (selectedConsumable?.quantity || 0) + qty;
        toast.success(`Stock In recorded. New balance: ${newBalance}`);
        setConsumableForm({
          date: today,
          consumableId: '',
          quantity: '',
          receivedBy: user?.fullName || '',
          reference: '',
          unitPrice: '',
          remarks: '',
        });
        fetchMovements();
      } else {
        toast.error(response.message || 'Failed to record stock in');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record stock in');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMovementsTable = () => {
    if (movementsLoading) {
      return <LinearProgress sx={{ mt: 2 }} />;
    }
    if (!movements.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No recent stock in records
        </Typography>
      );
    }
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600, align: 'right' }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Received By</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.map((m, i) => {
              const type = m.type || '';
              const isSpare = type === 'stockIn' || type.includes('spare') || type.includes('Spare');
              const typeLabel = isSpare ? 'Spare Part' : 'Consumable';
              const typeColor = isSpare ? 'primary' : 'secondary';
              return (
                <TableRow key={m.id || m._id || i} hover>
                  <TableCell>{m.date ? dayjs(m.date).format('MMM D, YYYY') : m.createdAt ? dayjs(m.createdAt).format('MMM D, YYYY') : '-'}</TableCell>
                  <TableCell>
                    <Chip label={typeLabel} color={typeColor} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{m.item || m.itemName || m.sparePart?.name || m.consumable?.name || m.name || '-'}</TableCell>
                  <TableCell align="right">{m.quantity ?? '-'}</TableCell>
                  <TableCell>{m.receivedBy || m.user || m.userName || '-'}</TableCell>
                  <TableCell>{m.reference || m.poNo || '-'}</TableCell>
                  <TableCell>{m.remarks || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Stock In - Receive Inventory
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Record incoming inventory for spare parts and consumables.
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
            <Tab label="Spare Parts" />
            <Tab label="Consumables" />
          </Tabs>

          {tabValue === 0 && (
            <Box component="form" onSubmit={handleSpareSubmit} noValidate>
              {sparePartsLoading ? (
                <LinearProgress sx={{ mb: 2 }} />
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Date"
                    type="date"
                    value={spareForm.date}
                    onChange={(e) => setSpareForm({ ...spareForm, date: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    select
                    label="Spare Part"
                    value={spareForm.sparePartId}
                    onChange={(e) => setSpareForm({ ...spareForm, sparePartId: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting || sparePartsLoading}
                    helperText={selectedSparePart ? `Current balance: ${selectedSparePart.quantity ?? 0}` : 'Select a spare part'}
                  >
                    {spareParts.map((p) => {
                      const id = p.id || p._id;
                      return (
                        <MenuItem key={id} value={id}>
                          {p.sku ? `${p.sku} - ` : ''}{p.name || ''} (Qty: {p.quantity ?? 0})
                        </MenuItem>
                      );
                    })}
                  </TextField>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={spareForm.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || Number(val) >= 0) {
                        setSpareForm({ ...spareForm, quantity: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-') e.preventDefault();
                    }}
                    fullWidth
                    required
                    disabled={submitting}
                    InputProps={{ inputProps: { min: 1, step: 1 } }}
                    error={!!spareForm.quantity && Number(spareForm.quantity) <= 0}
                    helperText={!!spareForm.quantity && Number(spareForm.quantity) <= 0 ? 'Quantity must be at least 1' : ''}
                  />
                  <TextField
                    label="Received By"
                    value={spareForm.receivedBy}
                    onChange={(e) => setSpareForm({ ...spareForm, receivedBy: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting}
                  />
                  <TextField
                    label="Reference / PO No."
                    value={spareForm.reference}
                    onChange={(e) => setSpareForm({ ...spareForm, reference: e.target.value })}
                    fullWidth
                    disabled={submitting}
                  />
                  <TextField
                    label="Unit Price"
                    type="number"
                    value={spareForm.unitPrice}
                    onChange={(e) => setSpareForm({ ...spareForm, unitPrice: e.target.value })}
                    fullWidth
                    disabled={submitting}
                    helperText={selectedSparePart && !spareForm.unitPrice ? `Existing: ${selectedSparePart.unitPrice ?? 'N/A'}` : 'Leave blank to use existing price'}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                  <TextField
                    label="Remarks"
                    value={spareForm.remarks}
                    onChange={(e) => setSpareForm({ ...spareForm, remarks: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    disabled={submitting}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {submitting ? 'Recording...' : 'Record Stock In'}
                  </Button>
                </Stack>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box component="form" onSubmit={handleConsumableSubmit} noValidate>
              {consumablesLoading ? (
                <LinearProgress sx={{ mb: 2 }} />
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Date"
                    type="date"
                    value={consumableForm.date}
                    onChange={(e) => setConsumableForm({ ...consumableForm, date: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    select
                    label="Consumable"
                    value={consumableForm.consumableId}
                    onChange={(e) => setConsumableForm({ ...consumableForm, consumableId: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting || consumablesLoading}
                    helperText={selectedConsumable ? `Current balance: ${selectedConsumable.quantity ?? 0}` : 'Select a consumable'}
                  >
                    {consumables.map((c) => {
                      const id = c.id || c._id;
                      return (
                        <MenuItem key={id} value={id}>
                          {c.sku ? `${c.sku} - ` : ''}{c.name || ''} (Qty: {c.quantity ?? 0})
                        </MenuItem>
                      );
                    })}
                  </TextField>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={consumableForm.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || Number(val) >= 0) {
                        setConsumableForm({ ...consumableForm, quantity: val });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-') e.preventDefault();
                    }}
                    fullWidth
                    required
                    disabled={submitting}
                    InputProps={{ inputProps: { min: 1, step: 1 } }}
                    error={!!consumableForm.quantity && Number(consumableForm.quantity) <= 0}
                    helperText={!!consumableForm.quantity && Number(consumableForm.quantity) <= 0 ? 'Quantity must be at least 1' : ''}
                  />
                  <TextField
                    label="Received By"
                    value={consumableForm.receivedBy}
                    onChange={(e) => setConsumableForm({ ...consumableForm, receivedBy: e.target.value })}
                    fullWidth
                    required
                    disabled={submitting}
                  />
                  <TextField
                    label="Reference / PO No."
                    value={consumableForm.reference}
                    onChange={(e) => setConsumableForm({ ...consumableForm, reference: e.target.value })}
                    fullWidth
                    disabled={submitting}
                  />
                  <TextField
                    label="Unit Price"
                    type="number"
                    value={consumableForm.unitPrice}
                    onChange={(e) => setConsumableForm({ ...consumableForm, unitPrice: e.target.value })}
                    fullWidth
                    disabled={submitting}
                    helperText={selectedConsumable && !consumableForm.unitPrice ? `Existing: ${selectedConsumable.unitPrice ?? 'N/A'}` : 'Leave blank to use existing price'}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                  <TextField
                    label="Remarks"
                    value={consumableForm.remarks}
                    onChange={(e) => setConsumableForm({ ...consumableForm, remarks: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    disabled={submitting}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {submitting ? 'Recording...' : 'Record Stock In'}
                  </Button>
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Recent Stock In Records
          </Typography>
          {renderMovementsTable()}
        </CardContent>
      </Card>
    </Container>
  );
};

export default StockInPage;
