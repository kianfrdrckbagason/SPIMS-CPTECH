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
  FaSearch,
  FaFilter,
  FaBoxes,
  FaArrowDown,
  FaArrowUp,
  FaEllipsisV,
  FaArchive,
  FaUndo,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import * as consumableApi from '../services/consumableApi';
import { consumableStockIn, consumableRelease } from '../services/stockApi';

const getStockStatusInfo = (qty, minStock = 0) => {
  if (qty <= 0) return { color: 'error', label: 'OUT' };
  if (minStock > 0 && qty <= minStock) return { color: 'warning', label: 'LOW' };
  return { color: 'success', label: 'OK' };
};

const CONSUMABLE_STATUSES = ['active', 'inactive', 'discontinued'];

const EMPTY_FORM = {
  name: '',
  unit: '',
  quantity: 0,
  status: 'active',
  movementClassification: 'medium',
};

const ConsumablesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ── list state ──────────────────────────────────────────────────────────────
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

  // ── create/edit dialog ───────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});

  // ── action chooser dialog ────────────────────────────────────────────────────
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ── stock in/out dialog ──────────────────────────────────────────────────────
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAction, setStockAction] = useState('in'); // 'in' | 'out'
  const [stockDate, setStockDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockDepartment, setStockDepartment] = useState('');
  const [stockReceivedBy, setStockReceivedBy] = useState('');
  const [stockQty, setStockQty] = useState(1);
  const [stockRemarks, setStockRemarks] = useState('');
  const [stockReference, setStockReference] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState(null);

  // ── search debounce ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── fetch list ───────────────────────────────────────────────────────────────
  const buildParams = () => {
    const params = { page: page + 1, limit: rowsPerPage };
    if (searchDebounced) params.search = searchDebounced;
    if (unitFilter) params.unit = unitFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await consumableApi.getAllConsumables(buildParams());
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

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, searchDebounced, unitFilter, statusFilter]);

  // ── pagination ───────────────────────────────────────────────────────────────
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // ── create/edit ──────────────────────────────────────────────────────────────
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
      unit: row.unit || '',
      quantity: row.quantity ?? 0,
      status: row.status || 'active',
      movementClassification: row.movementClassification || 'medium',
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
    if (!formData.unit?.trim()) errors.unit = 'Unit is required (e.g. box, pair, piece)';
    if (
      formData.quantity === '' ||
      formData.quantity === null ||
      isNaN(Number(formData.quantity))
    )
      errors.quantity = 'Valid quantity is required';
    else if (Number(formData.quantity) < 0)
      errors.quantity = 'Quantity cannot be negative';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = { ...formData, quantity: Number(formData.quantity) };
      const res = editingId
        ? await consumableApi.updateConsumable(editingId, payload)
        : await consumableApi.createConsumable(payload);

      if (res?.success) {
        toast.success(res.message || (editingId ? 'Updated successfully' : 'Created successfully'));
        setDialogOpen(false);
        setEditingId(null);
        setPage(0);
        await fetchItems();
      } else {
        if (res?.errors && Array.isArray(res.errors)) {
          const fieldErrors = {};
          res.errors.forEach((e) => { if (e.field) fieldErrors[e.field] = e.message; });
          if (Object.keys(fieldErrors).length) setFormErrors(fieldErrors);
        }
        toast.error(res?.message || 'Operation failed');
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.data?.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach((e) => { if (e.field) fieldErrors[e.field] = e.message; });
        if (Object.keys(fieldErrors).length) setFormErrors(fieldErrors);
      }
      toast.error(msg || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── action chooser ───────────────────────────────────────────────────────────
  const openActionDialog = (row) => {
    setSelectedItem(row);
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setSelectedItem(null);
  };

  // ── stock in/out ─────────────────────────────────────────────────────────────
  const openStockDialog = (row, action) => {
    setSelectedItem(row);
    setStockAction(action);
    setStockDate(new Date().toISOString().slice(0, 10));
    setStockDepartment('');
    setStockReceivedBy(user?.fullName || '');
    setStockQty(1);
    setStockRemarks('');
    setStockReference('');
    setStockDialogOpen(true);
  };

  const closeStockDialog = () => {
    setStockDialogOpen(false);
    setSelectedItem(null);
  };

  // ── deactivate / reactivate ──────────────────────────────────────────────────
  const handleToggleStatus = async (row) => {
    const isActive = row.status === 'active';
    const newStatus = isActive ? 'inactive' : 'active';
    const label = isActive ? 'deactivate' : 'reactivate';
    try {
      const res = await consumableApi.updateConsumable(row._id, { status: newStatus });
      if (res?.success) {
        toast.success(`Consumable ${label}d successfully`);
        await fetchItems();
      } else {
        toast.error(res?.message || `Failed to ${label} consumable`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${label} consumable`);
    }
  };

  const submitStock = async () => {
    if (!selectedItem) return;

    const qty = Number(stockQty);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (!stockDate) {
      toast.error('Date is required');
      return;
    }
    if (!stockReceivedBy.trim()) {
      toast.error(stockAction === 'in' ? 'Received By is required' : 'Released By is required');
      return;
    }
    if (stockAction === 'out') {
      if (!stockDepartment.trim()) {
        toast.error('Department is required');
        return;
      }
      if (qty > (selectedItem.quantity || 0)) {
        toast.error(`Quantity exceeds available stock (${selectedItem.quantity || 0})`);
        return;
      }
    }

    setStockSubmitting(true);
    try {
      const payload = {
        consumable: selectedItem._id,
        quantity: qty,
        date: stockDate,
        remarks: stockRemarks || undefined,
      };

      let res;
      if (stockAction === 'in') {
        payload.receivedBy = stockReceivedBy;
        res = await consumableStockIn(payload);
      } else {
        payload.releasedBy = stockReceivedBy;
        payload.department = stockDepartment;
        payload.employeeName = stockReceivedBy;
        res = await consumableRelease(payload);
      }

      if (res?.success) {
        const newBalance =
          res.data?.consumable?.quantity ??
          res.data?.transaction?.balanceAfter ??
          (stockAction === 'in'
            ? (selectedItem.quantity || 0) + qty
            : (selectedItem.quantity || 0) - qty);
        toast.success(
          `${stockAction === 'in' ? 'Stock In' : 'Stock Out'} recorded. New balance: ${newBalance}`
        );
        closeStockDialog();
        await fetchItems();
      } else {
        toast.error(res?.message || 'Operation failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setStockSubmitting(false);
    }
  };

  // ── skeleton rows ─────────────────────────────────────────────────────────────
  const renderSkeletonRows = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton variant="text" />
            </TableCell>
          ))}
        </TableRow>
      )),
    []
  );

  // ── stock-out quantity validation ─────────────────────────────────────────────
  const stockQtyError =
    stockAction === 'out' &&
    selectedItem &&
    stockQty &&
    Number(stockQty) > (selectedItem.quantity || 0)
      ? `Exceeds available stock (${selectedItem.quantity || 0})`
      : Number(stockQty) <= 0 && stockQty !== ''
      ? 'Must be at least 1'
      : '';

  // ── render ────────────────────────────────────────────────────────────────────
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

      {/* ── Filters bar ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name..."
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
                onChange={(e) => { setUnitFilter(e.target.value); setPage(0); }}
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
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="con-status-label">Status</InputLabel>
                <Select
                  labelId="con-status-label"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
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

      {/* ── Table ── */}
      <Card>
        <TableContainer component={Paper} variant="outlined" sx={{ border: 'none' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                renderSkeletonRows
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6 }}>
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
                  const minStock = Number(row.minStockLevel) || 0;
                  const status = getStockStatusInfo(qty, minStock);
                  return (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.name}
                        </Typography>
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
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<FaEllipsisV />}
                          onClick={() => openActionDialog(row)}
                        >
                          Action
                        </Button>
                      </TableCell>
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

      {/* ── Action chooser dialog ── */}
      <Dialog open={actionDialogOpen} onClose={closeActionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaBoxes />
            <Typography variant="h6" fontWeight={700}>
              Choose Action
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<FaArrowDown />}
              onClick={() => { closeActionDialog(); openStockDialog(selectedItem, 'in'); }}
            >
              Stock In
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<FaArrowUp />}
              onClick={() => { closeActionDialog(); openStockDialog(selectedItem, 'out'); }}
            >
              Stock Out
            </Button>
            {isAdmin && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FaEdit />}
                onClick={() => { closeActionDialog(); openEditDialog(selectedItem); }}
              >
                Edit
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FaArchive />}
                onClick={() => {
                  const row = selectedItem;
                  closeActionDialog();
                  setItemToDeactivate(row);
                  setDeactivateDialogOpen(true);
                }}
              >
                Deactivate
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeActionDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ── Deactivate dialog ── */}
      <Dialog open={deactivateDialogOpen} onClose={() => { setDeactivateDialogOpen(false); setItemToDeactivate(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaArchive />
            <Typography variant="h6" fontWeight={700}>
              Deactivate Consumable
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Are you sure you want to deactivate <strong>{itemToDeactivate?.name}</strong>? 
            Deactivated items will no longer appear in stock operations but will remain in history.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setDeactivateDialogOpen(false); setItemToDeactivate(null); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!itemToDeactivate) return;
              try {
                const res = await consumableApi.updateConsumable(itemToDeactivate._id, { status: 'inactive' });
                if (res?.success) {
                  toast.success('Consumable deactivated successfully');
                  await fetchItems();
                } else {
                  toast.error(res?.message || 'Failed to deactivate consumable');
                }
              } catch (err) {
                toast.error(err?.response?.data?.message || 'Failed to deactivate consumable');
              } finally {
                setDeactivateDialogOpen(false);
                setItemToDeactivate(null);
              }
            }}
          >
            Yes, Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Stock In / Stock Out dialog ── */}
      <Dialog
        open={stockDialogOpen}
        onClose={stockSubmitting ? undefined : closeStockDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {stockAction === 'in' ? <FaArrowDown /> : <FaArrowUp />}
            <Typography variant="h6" fontWeight={700}>
              {stockAction === 'in' ? 'Stock In' : 'Stock Out'} — {selectedItem?.name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Unit: {selectedItem?.unit || '—'} &nbsp;|&nbsp; Current Qty:{' '}
              {selectedItem?.quantity ?? 0}
            </Typography>

            <TextField
              fullWidth
              label="Date"
              type="date"
              value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />

            {stockAction === 'out' && (
              <TextField
                fullWidth
                label="Department"
                value={stockDepartment}
                onChange={(e) => setStockDepartment(e.target.value)}
                required
              />
            )}

            <TextField
              fullWidth
              label={stockAction === 'in' ? 'Received By' : 'Released By'}
              value={stockReceivedBy}
              onChange={(e) => setStockReceivedBy(e.target.value)}
              required
            />

            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={stockQty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) setStockQty(val);
              }}
              onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
              InputProps={{ inputProps: { min: 1, step: 1 } }}
              required
              error={!!stockQtyError}
              helperText={
                stockQtyError ||
                (stockAction === 'out' && selectedItem
                  ? `Max: ${selectedItem.quantity ?? 0}`
                  : '')
              }
            />

            <TextField
              fullWidth
              label="Remarks"
              value={stockRemarks}
              onChange={(e) => setStockRemarks(e.target.value)}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeStockDialog} disabled={stockSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={stockAction === 'in' ? 'success' : 'warning'}
            onClick={submitStock}
            disabled={
              stockSubmitting ||
              (stockAction === 'out' && !!stockQtyError)
            }
            startIcon={stockSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {stockSubmitting
              ? 'Saving...'
              : stockAction === 'in'
              ? 'Record Stock In'
              : 'Record Stock Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create / Edit dialog ── */}
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
            <Grid item xs={12}>
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
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
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="con-form-movement-label">Movement Classification</InputLabel>
                <Select
                  labelId="con-form-movement-label"
                  label="Movement Classification"
                  value={formData.movementClassification}
                  onChange={(e) => setField('movementClassification', e.target.value)}
                >
                  <MenuItem value="fast">Fast Moving</MenuItem>
                  <MenuItem value="medium">Medium Moving</MenuItem>
                  <MenuItem value="low">Low Moving</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Quantity *"
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || Number(val) >= 0) setField('quantity', val);
                }}
                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
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
