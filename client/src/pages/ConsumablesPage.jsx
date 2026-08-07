import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Skeleton,
  TableContainer,
  InputAdornment,
} from '@mui/material';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaBoxes,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import * as consumableApi from '../services/consumableApi';

const getStockStatusInfo = (qty) => {
  if (qty <= 0) return { color: 'error', label: 'OUT' };
  return { color: 'success', label: 'OK' };
};

const CONSUMABLE_STATUSES = ['active', 'inactive', 'discontinued'];

const EMPTY_FORM = {
  name: '',
  sku: '',
  description: '',
  unit: '',
  quantity: 0,
  status: 'active',
};

const ConsumablesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
        };
        if (searchDebounced) params.search = searchDebounced;
        if (unitFilter) params.unit = unitFilter;
        if (statusFilter) params.status = statusFilter;

        const res = await consumableApi.getAllConsumables(params);
        if (res?.success) {
          setItems(res.data || []);
          setTotal(res.total || 0);
        } else {
          setItems([]);
          setTotal(0);
          toast.error(res?.message || 'Failed to load consumables');
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load consumables');
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [page, rowsPerPage, searchDebounced, unitFilter, statusFilter]);

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row._id);
    setFormData({
      name: row.name || '',
      sku: row.sku || '',
      description: row.description || '',
      unit: row.unit || '',
      quantity: row.quantity ?? 0,
      status: row.status || 'active',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.sku?.trim()) errors.sku = 'SKU is required';
    if (!formData.unit?.trim()) errors.unit = 'Unit is required (e.g. box, pair, piece)';
    if (formData.quantity === '' || formData.quantity === null || isNaN(Number(formData.quantity)))
      errors.quantity = 'Valid quantity is required';
    else if (Number(formData.quantity) < 0) errors.quantity = 'Quantity cannot be negative';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
      };
      let res;
      if (editingId) {
        res = await consumableApi.updateConsumable(editingId, payload);
      } else {
        res = await consumableApi.createConsumable(payload);
      }
      if (res?.success) {
        toast.success(res.message || (editingId ? 'Updated successfully' : 'Created successfully'));
        setDialogOpen(false);
        setEditingId(null);
        setPage(0);
        const params = {
          page: page + 1,
          limit: rowsPerPage,
        };
        if (searchDebounced) params.search = searchDebounced;
        if (unitFilter) params.unit = unitFilter;
        if (statusFilter) params.status = statusFilter;
        const refetch = await consumableApi.getAllConsumables(params);
        if (refetch?.success) {
          setItems(refetch.data || []);
          setTotal(refetch.total || 0);
        }
      } else {
        if (res?.errors && Array.isArray(res.errors)) {
          const fieldErrors = {};
          res.errors.forEach((e) => {
            if (e.field) fieldErrors[e.field] = e.message;
          });
          if (Object.keys(fieldErrors).length) setFormErrors(fieldErrors);
        }
        toast.error(res?.message || 'Operation failed');
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const fieldErrors = {};
        err.response.data.errors.forEach((e) => {
          if (e.field) fieldErrors[e.field] = e.message;
        });
        if (Object.keys(fieldErrors).length) setFormErrors(fieldErrors);
      }
      toast.error(msg || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'Delete Consumable?',
      text: `Are you sure you want to delete "${row.name}" (${row.sku})? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await consumableApi.deleteConsumable(row._id);
      if (res?.success) {
        toast.success(res.message || 'Deleted successfully');
        const params = {
          page: page + 1,
          limit: rowsPerPage,
        };
        if (searchDebounced) params.search = searchDebounced;
        if (unitFilter) params.unit = unitFilter;
        if (statusFilter) params.status = statusFilter;
        const refetch = await consumableApi.getAllConsumables(params);
        if (refetch?.success) {
          setItems(refetch.data || []);
          setTotal(refetch.total || 0);
          if (refetch.data.length === 0 && page > 0) setPage(page - 1);
        }
      } else {
        toast.error(res?.message || 'Delete failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const renderSkeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton variant="text" />
            </TableCell>
          ))}
        </TableRow>
      )),
    []
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Consumables Inventory
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track all consumable supplies, stock levels, and unit measurements.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaSearch />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Unit"
                placeholder="Filter by unit..."
                value={unitFilter}
                onChange={(e) => {
                  setUnitFilter(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaFilter style={{ fontSize: 12 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="con-status-label">Status</InputLabel>
                <Select
                  labelId="con-status-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {CONSUMABLE_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
              md={5}
              sx={{ display: 'flex', justifyContent: 'flex-end' }}
            >
              {isAdmin ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FaPlus />}
                  onClick={openCreateDialog}
                >
                  New Consumable
                </Button>
              ) : (
                <Chip
                  icon={<FaBoxes />}
                  label={`${total} items`}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Grid>
          </Grid>
          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                {isAdmin && <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                renderSkeletonRows
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} sx={{ py: 6 }}>
                    <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      <FaBoxes style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body1">No consumables found</Typography>
                      <Typography variant="caption">
                        Try adjusting your filters or create a new consumable.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const qty = Number(row.quantity) || 0;
                  const status = getStockStatusInfo(qty);
                  return (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {row.sku}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {row.description ? (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {row.description.length > 80
                              ? row.description.slice(0, 80) + '...'
                              : row.description}
                          </Typography>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={row.unit || '—'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {qty.toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEditDialog(row)}
                            >
                              <FaEdit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(row)}
                            >
                              <FaTrash />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={submitting ? undefined : closeDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaBoxes />
            <Typography variant="h6" fontWeight={700}>
              {editingId ? 'Edit Consumable' : 'New Consumable'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => setField('name', e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SKU *"
                value={formData.sku}
                onChange={(e) => setField('sku', e.target.value.toUpperCase())}
                error={!!formErrors.sku}
                helperText={formErrors.sku}
                required
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unit *"
                value={formData.unit}
                onChange={(e) => setField('unit', e.target.value)}
                error={!!formErrors.unit}
                helperText={formErrors.unit || 'e.g. box, pair, piece, roll, meter'}
                placeholder="box / pair / piece / etc."
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="con-form-status-label">Status</InputLabel>
                <Select
                  labelId="con-form-status-label"
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  {CONSUMABLE_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity *"
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || Number(val) >= 0) {
                    setField('quantity', val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-') e.preventDefault();
                }}
                error={!!formErrors.quantity}
                helperText={formErrors.quantity}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsumablesPage;
