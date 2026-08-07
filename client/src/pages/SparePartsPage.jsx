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
  FaBoxes,
  FaArrowDown,
  FaArrowUp,
  FaEllipsisV,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import * as sparePartApi from '../services/sparePartApi';
import * as categoryApi from '../services/categoryApi';

const getStockStatusInfo = (qty, minStock) => {
  if (qty <= 0) return { color: 'error', label: 'OUT' };
  if (qty <= minStock) return { color: 'warning', label: 'LOW' };
  return { color: 'success', label: 'OK' };
};

const SPARE_PART_STATUSES = ['active', 'inactive', 'discontinued', 'archived'];

const EMPTY_FORM = {
  name: '',
  partNumber: 0,
  category: '',
  quantity: 0,
  status: 'active',
};

const SparePartsPage = () => {
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAction, setStockAction] = useState('in');
  const [stockDate, setStockDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockDepartment, setStockDepartment] = useState('');
  const [stockMachine, setStockMachine] = useState('');
  const [stockRequestedBy, setStockRequestedBy] = useState('');
  const [stockQty, setStockQty] = useState(1);
  const [stockRemarks, setStockRemarks] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

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
        if (categoryFilter) params.category = categoryFilter;
        if (statusFilter) params.status = statusFilter;

        const res = await sparePartApi.getAllSpareParts(params);
        if (res?.success) {
          setItems(res.data || []);
          setTotal(res.total || 0);
        } else {
          setItems([]);
          setTotal(0);
          toast.error(res?.message || 'Failed to load spare parts');
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load spare parts');
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [page, rowsPerPage, searchDebounced, categoryFilter, statusFilter]);

  useEffect(() => {
    const fetchRefs = async () => {
      setCategoriesLoading(true);
      try {
        const catRes = await categoryApi.getAllCategories({ status: 'active' });
        setCategories(catRes?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchRefs();
  }, []);

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const openCreateDialog = async () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row._id);
    setFormData({
      name: row.name || '',
      partNumber: row.partNumber ?? 0,
      category: typeof row.category === 'object' ? row.category?._id : row.category || '',
      quantity: row.quantity ?? 0,
      status: row.status || 'active',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openActionDialog = (row) => {
    setSelectedPart(row);
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setSelectedPart(null);
  };

  const openStockDialog = (row, action) => {
    setSelectedPart(row);
    setStockAction(action);
    setStockDate(new Date().toISOString().slice(0, 10));
    setStockDepartment('');
    setStockMachine(row.machine || '');
    setStockRequestedBy('');
    setStockQty(1);
    setStockRemarks('');
    setStockDialogOpen(true);
  };

  const closeStockDialog = () => {
    setStockDialogOpen(false);
    setSelectedPart(null);
  };

  const submitStock = async () => {
    if (!selectedPart) return;
    if (!stockQty || Number(stockQty) <= 0) return toast.error('Enter a valid quantity');
    if (stockAction === 'out') {
      if (!stockDate) return toast.error('Date is required');
      if (!stockDepartment.trim()) return toast.error('Department is required');
      if (!stockMachine.trim()) return toast.error('Machine is required');
      if (!stockRequestedBy.trim()) return toast.error('Requested By is required');
      if (Number(stockQty) < 0) return toast.error('Quantity cannot be negative');
    }
    setStockSubmitting(true);
    try {
      const payload = {
        sparePart: selectedPart._id,
        quantity: Number(stockQty),
      };
      if (stockAction === 'out') {
        Object.assign(payload, {
          date: stockDate,
          employeeName: stockRequestedBy,
          department: stockDepartment,
          machine: stockMachine,
          releasedBy: stockRequestedBy,
          remarks: stockRemarks,
        });
      } else {
        payload.remarks = stockRemarks || undefined;
      }
      let res;
      if (stockAction === 'in') {
        res = await (await import('../services/stockApi')).sparePartStockIn(payload);
      } else {
        res = await (await import('../services/stockApi')).sparePartStockOut(payload);
      }
      if (res?.success) {
        toast.success(res.message || 'Stock updated');
        closeStockDialog();
        // refresh list
        const params = { page: page + 1, limit: rowsPerPage };
        if (searchDebounced) params.search = searchDebounced;
        if (categoryFilter) params.category = categoryFilter;
        if (statusFilter) params.status = statusFilter;
        const refetch = await sparePartApi.getAllSpareParts(params);
        if (refetch?.success) {
          setItems(refetch.data || []);
          setTotal(refetch.total || 0);
        }
      } else {
        toast.error(res?.message || 'Operation failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setStockSubmitting(false);
    }
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
    if (formData.partNumber !== '' && formData.partNumber !== null && !isNaN(Number(formData.partNumber))) {
      if (Number(formData.partNumber) < 0) errors.partNumber = 'Part number must be zero or positive';
    }
    if (!formData.category) errors.category = 'Category is required';
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
        name: formData.name,
        partNumber: Number(formData.partNumber) || 0,
        category: formData.category,
        quantity: Number(formData.quantity),
        status: formData.status,
      };
      let res;
      if (editingId) {
        res = await sparePartApi.updateSparePart(editingId, payload);
      } else {
        res = await sparePartApi.createSparePart(payload);
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
        if (categoryFilter) params.category = categoryFilter;
        if (statusFilter) params.status = statusFilter;
        const refetch = await sparePartApi.getAllSpareParts(params);
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
      title: 'Delete Spare Part?',
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
      const res = await sparePartApi.deleteSparePart(row._id);
      if (res?.success) {
        toast.success(res.message || 'Deleted successfully');
        const params = {
          page: page + 1,
          limit: rowsPerPage,
        };
        if (searchDebounced) params.search = searchDebounced;
        if (categoryFilter) params.category = categoryFilter;
        if (statusFilter) params.status = statusFilter;
        const refetch = await sparePartApi.getAllSpareParts(params);
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
          {Array.from({ length: 11 }).map((__, j) => (
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
          Spare Parts Inventory
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track spare part inventory with name, category, quantity, and status.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search all spare parts"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="sp-category-label">Category</InputLabel>
                <Select
                  labelId="sp-category-label"
                  label="Category"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
              {isAdmin ? (
                <Button
                  fullWidth={false}
                  variant="contained"
                  color="primary"
                  startIcon={<FaPlus />}
                  onClick={openCreateDialog}
                >
                  Add New Spare Part
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
                  <TableCell sx={{ fontWeight: 700 }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
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
                  <TableCell colSpan={6} sx={{ py: 6 }}>
                    <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      <FaBoxes style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body1">No spare parts found</Typography>
                      <Typography variant="caption">
                        Try adjusting your filters or create a new spare part.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const qty = Number(row.quantity) || 0;
                  const minStock = Number(row.minStockLevel) || 0;
                  const status = getStockStatusInfo(qty, minStock);
                  const catName =
                    typeof row.category === 'object' ? row.category?.name : row.category;
                  return (
                    <TableRow
                      key={row._id}
                      hover
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.partNumber ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{catName || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{qty.toLocaleString()}</TableCell>
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

      <Dialog
        open={actionDialogOpen}
        onClose={closeActionDialog}
        maxWidth="xs"
        fullWidth
      >
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
              onClick={() => {
                closeActionDialog();
                openStockDialog(selectedPart, 'in');
              }}
            >
              Stock In
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<FaArrowUp />}
              onClick={() => {
                closeActionDialog();
                openStockDialog(selectedPart, 'out');
              }}
            >
              Stock Out
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                closeActionDialog();
                openEditDialog(selectedPart);
              }}
            >
              Edit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeActionDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

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
              {editingId ? 'Edit Spare Part' : 'New Spare Part'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={8}>
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
                label="Part Number"
                type="number"
                value={formData.partNumber}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  const safe = isNaN(parsed) ? 0 : Math.max(0, parsed);
                  setField('partNumber', safe);
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                error={!!formErrors.partNumber}
                helperText={formErrors.partNumber || 'Zero or positive'}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.category}>
                <InputLabel id="sp-form-category-label">Category *</InputLabel>
                <Select
                  labelId="sp-form-category-label"
                  label="Category *"
                  value={formData.category}
                  onChange={(e) => setField('category', e.target.value)}
                  disabled={categoriesLoading}
                >
                  <MenuItem value="">
                    <em>
                      {categoriesLoading ? 'Loading categories...' : 'Select category'}
                    </em>
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error" sx={{ px: 1.75, pt: 0.5 }}>
                    {formErrors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="sp-form-status-label">Status</InputLabel>
                <Select
                  labelId="sp-form-status-label"
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  {SPARE_PART_STATUSES.map((s) => (
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
              {stockAction === 'in' ? 'Stock In' : 'Stock Out'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {selectedPart?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Category: {typeof selectedPart?.category === 'object' ? selectedPart?.category?.name : selectedPart?.category || '—'}
            </Typography>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 1 }}
              required
            />
            <TextField
              fullWidth
              label="Department"
              value={stockDepartment}
              onChange={(e) => setStockDepartment(e.target.value)}
              sx={{ mt: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Part Name"
              value={selectedPart?.name || ''}
              sx={{ mt: 2 }}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="Machine"
              value={stockMachine}
              onChange={(e) => setStockMachine(e.target.value)}
              sx={{ mt: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={stockQty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setStockQty(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === '-') e.preventDefault();
              }}
              InputProps={{ inputProps: { min: 1, step: 1 } }}
              sx={{ mt: 2 }}
              required
              error={!!stockQty && Number(stockQty) <= 0}
              helperText={!!stockQty && Number(stockQty) <= 0 ? 'Quantity must be at least 1' : ''}
            />
            <TextField
              fullWidth
              label="Requested By"
              value={stockRequestedBy}
              onChange={(e) => setStockRequestedBy(e.target.value)}
              sx={{ mt: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Remarks"
              value={stockRemarks}
              onChange={(e) => setStockRemarks(e.target.value)}
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeStockDialog} disabled={stockSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            color={stockAction === 'in' ? 'success' : 'warning'}
            onClick={submitStock}
            disabled={stockSubmitting}
          >
            {stockSubmitting ? 'Saving...' : stockAction === 'in' ? 'Stock In' : 'Stock Out'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SparePartsPage;
