import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  FaPlus,
  FaSearch,
  FaBoxes,
  FaArrowDown,
  FaArrowUp,
  FaEllipsisV,
  FaSave,
  FaTimes,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import * as sparePartApi from '../services/sparePartApi';
import * as categoryApi from '../services/categoryApi';

// ── Movement-based stock status ───────────────────────────────────────────────
// Fast:   qty >= 10 = Normal, qty 1-9  = Low, qty 0 = Out
// Medium: qty >= 5  = Normal, qty 1-4  = Low, qty 0 = Out
// Low:    qty >= 2  = Normal, qty 1    = Low, qty 0 = Out
const MOVEMENT_THRESHOLDS = {
  fast:   { normal: 10, low: 9,  out: 0 },
  medium: { normal: 5,  low: 4,  out: 0 },
  low:    { normal: 2,  low: 1,  out: 0 },
};

const getStockStatusInfo = (qty, movementClassification = 'medium') => {
  const t = MOVEMENT_THRESHOLDS[movementClassification] || MOVEMENT_THRESHOLDS.medium;
  if (qty <= t.out) return { color: 'error',   label: 'OUT', key: 'out' };
  if (qty <= t.low) return { color: 'warning', label: 'LOW', key: 'low' };
  return               { color: 'success', label: 'OK',  key: 'good' };
};

// ── Constants ─────────────────────────────────────────────────────────────────
const SPARE_PART_STATUSES = ['active', 'inactive', 'discontinued', 'archived'];

const EMPTY_FORM = {
  name: '',
  category: '',
  quantity: 0,
  status: 'active',
  movementClassification: 'medium',
  sortOrder: 0,
};

// Map URL query param values → filter keys used in rendering
const STOCK_STATUS_OPTIONS = [
  { value: '',    label: 'All' },
  { value: 'good', label: 'Good Stock' },
  { value: 'low',  label: 'Low Stock' },
  { value: 'out',  label: 'Out of Stock' },
];

const SparePartsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const navigate = useNavigate();

  // ── list state ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');       // item lifecycle status (active/inactive…)
  const [stockStatusFilter, setStockStatusFilter] = useState(''); // good / low / out

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // ── dialog state ────────────────────────────────────────────────────────────
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});

  // ── stock in/out dialog ─────────────────────────────────────────────────────
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

  // ── inline sort-order editing ───────────────────────────────────────────────
  const [editingSortId, setEditingSortId] = useState(null);
  const [editingSortValue, setEditingSortValue] = useState('');
  const sortInputRef = useRef(null);

  // ── read initial stock status filter from URL query param ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sq = params.get('stockStatus');
    if (sq && STOCK_STATUS_OPTIONS.some(o => o.value === sq)) {
      setStockStatusFilter(sq);
    }
  }, []); // run once on mount

  // ── search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounced(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── fetch list ───────────────────────────────────────────────────────────────
  const buildParams = () => {
    const params = { page: page + 1, limit: rowsPerPage };
    if (searchDebounced) params.search = searchDebounced;
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter)   params.status = statusFilter;
    // stockStatusFilter is client-side only (post-fetch filter)
    return params;
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await sparePartApi.getAllSpareParts(buildParams());
      if (res?.success) {
        setItems(res.data || []);
        setTotal(res.total || 0);
      } else {
        setItems([]); setTotal(0);
        toast.error(res?.message || 'Failed to load spare parts');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load spare parts');
      setItems([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [page, rowsPerPage, searchDebounced, categoryFilter, statusFilter]);

  useEffect(() => {
    const fetchRefs = async () => {
      setCategoriesLoading(true);
      try {
        const catRes = await categoryApi.getAllCategories({ status: 'active' });
        setCategories(catRes?.data || []);
      } catch { /* ignore */ } finally {
        setCategoriesLoading(false);
      }
    };
    fetchRefs();
  }, []);

  // ── stock-status client-side filter ─────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!stockStatusFilter) return items;
    return items.filter((row) => {
      const s = getStockStatusInfo(Number(row.quantity) || 0, row.movementClassification);
      return s.key === stockStatusFilter;
    });
  }, [items, stockStatusFilter]);

  // ── sort by sortOrder then createdAt ─────────────────────────────────────────
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const sa = a.sortOrder ?? 0;
      const sb = b.sortOrder ?? 0;
      if (sa !== sb) return sa - sb;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  }, [filteredItems]);

  // ── sequential row numbers (reset per category) ─────────────────────────────
  const sequenceMap = useMemo(() => {
    const map = {};
    let currentCat = null;
    let counter = 0;
    for (const row of sortedItems) {
      const catName = typeof row.category === 'object' ? row.category?.name || '' : row.category || '';
      if (catName !== currentCat) { currentCat = catName; counter = 1; }
      else { counter += 1; }
      map[row._id] = counter;
    }
    return map;
  }, [sortedItems]);

  // ── pagination ───────────────────────────────────────────────────────────────
  const handleChangePage = (_e, p) => setPage(p);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  // ── create / edit ────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingId(null); setFormData({ ...EMPTY_FORM }); setFormErrors({}); setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setEditingId(row._id);
    setFormData({
      name: row.name || '',
      category: typeof row.category === 'object' ? row.category?._id : row.category || '',
      quantity: row.quantity ?? 0,
      status: row.status || 'active',
      movementClassification: row.movementClassification || 'medium',
      sortOrder: row.sortOrder ?? 0,
    });
    setFormErrors({}); setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); };

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.quantity === '' || isNaN(Number(formData.quantity))) errors.quantity = 'Valid quantity is required';
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
        category: formData.category,
        quantity: Number(formData.quantity),
        status: formData.status,
        movementClassification: formData.movementClassification,
        sortOrder: Number(formData.sortOrder) >= 0 ? Number(formData.sortOrder) : 0,
      };
      const res = editingId
        ? await sparePartApi.updateSparePart(editingId, payload)
        : await sparePartApi.createSparePart(payload);

      if (res?.success) {
        toast.success(res.message || (editingId ? 'Updated successfully' : 'Created successfully'));
        setDialogOpen(false); setEditingId(null); setPage(0);
        await fetchItems();
      } else {
        if (res?.errors) {
          const fe = {}; res.errors.forEach((e) => { if (e.field) fe[e.field] = e.message; });
          if (Object.keys(fe).length) setFormErrors(fe);
        }
        toast.error(res?.message || 'Operation failed');
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.data?.errors) {
        const fe = {}; err.response.data.errors.forEach((e) => { if (e.field) fe[e.field] = e.message; });
        if (Object.keys(fe).length) setFormErrors(fe);
      }
      toast.error(msg || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'Delete Spare Part?',
      text: `Are you sure you want to delete "${row.name}"? This cannot be undone.`,
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
      if (res?.success) { toast.success(res.message || 'Deleted successfully'); await fetchItems(); }
      else toast.error(res?.message || 'Delete failed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  // ── action dialog ─────────────────────────────────────────────────────────────
  const openActionDialog = (row) => { setSelectedPart(row); setActionDialogOpen(true); };
  const closeActionDialog = () => { setActionDialogOpen(false); setSelectedPart(null); };

  // ── stock in/out dialog ───────────────────────────────────────────────────────
  const openStockDialog = (row, action) => {
    setSelectedPart(row);
    setStockAction(action);
    setStockDate(new Date().toISOString().slice(0, 10));
    if (action === 'out') {
      setStockDepartment('');
      setStockMachine(row.machine || '');
      setStockRequestedBy('');
    }
    setStockQty(1);
    setStockRemarks('');
    setStockDialogOpen(true);
  };

  const closeStockDialog = () => { setStockDialogOpen(false); setSelectedPart(null); };

  const submitStock = async () => {
    if (!selectedPart) return;
    if (!stockQty || Number(stockQty) <= 0) return toast.error('Enter a valid quantity');
    if (stockAction === 'out') {
      if (!stockDate) return toast.error('Date is required');
      if (!stockDepartment.trim()) return toast.error('Department is required');
      if (!stockMachine.trim()) return toast.error('Machine is required');
      if (!stockRequestedBy.trim()) return toast.error('Requested By is required');
    }
    setStockSubmitting(true);
    try {
      const payload = { sparePart: selectedPart._id, quantity: Number(stockQty) };
      if (stockAction === 'out') {
        Object.assign(payload, {
          date: stockDate,
          employeeName: stockRequestedBy,
          department: stockDepartment,
          machine: stockMachine,
          releasedBy: stockRequestedBy,
          remarks: stockRemarks || undefined,
        });
      } else {
        payload.date = stockDate;
        payload.remarks = stockRemarks || undefined;
      }
      const { sparePartStockIn, sparePartStockOut } = await import('../services/stockApi');
      const res = stockAction === 'in' ? await sparePartStockIn(payload) : await sparePartStockOut(payload);
      if (res?.success) {
        toast.success(res.message || 'Stock updated');
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

  // ── inline sort order editing ─────────────────────────────────────────────────
  const startEditSort = (row) => {
    setEditingSortId(row._id);
    setEditingSortValue(String(row.sortOrder ?? 0));
    setTimeout(() => sortInputRef.current?.focus(), 50);
  };

  const cancelEditSort = () => { setEditingSortId(null); setEditingSortValue(''); };

  const saveEditSort = async (row) => {
    const val = parseInt(editingSortValue, 10);
    if (isNaN(val) || val < 0) { toast.error('Sort order must be a non-negative number'); return; }
    if (val === (row.sortOrder ?? 0)) { cancelEditSort(); return; }
    try {
      const res = await sparePartApi.updateSparePart(row._id, { sortOrder: val });
      if (res?.success) {
        setItems((prev) => prev.map((p) => p._id === row._id ? { ...p, sortOrder: val } : p));
        toast.success('Sort order updated');
      } else {
        toast.error(res?.message || 'Failed to update sort order');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update sort order');
    } finally {
      cancelEditSort();
    }
  };

  // ── skeleton ──────────────────────────────────────────────────────────────────
  const renderSkeletonRows = useMemo(() =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 6 }).map((__, j) => (
          <TableCell key={j}><Skeleton variant="text" /></TableCell>
        ))}
      </TableRow>
    )), []);

  // ── render ────────────────────────────────────────────────────────────────────
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

      {/* ── Filters bar ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small" placeholder="Search all spare parts"
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><FaSearch /></InputAdornment>) }}
              />
            </Grid>

            {/* Category filter */}
            <Grid item xs={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel id="sp-category-label" shrink>Category</InputLabel>
                <Select
                  labelId="sp-category-label"
                  label="Category"
                  value={categoryFilter}
                  displayEmpty
                  notched
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Stock status filter — Task #42 */}
            <Grid item xs={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel id="sp-stock-status-label" shrink>Stock Status</InputLabel>
                <Select
                  labelId="sp-stock-status-label"
                  label="Stock Status"
                  value={stockStatusFilter}
                  displayEmpty
                  notched
                  onChange={(e) => { setStockStatusFilter(e.target.value); setPage(0); }}
                >
                  {STOCK_STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Add button */}
            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
              {isAdmin ? (
                <Button variant="contained" color="primary" startIcon={<FaPlus />} onClick={openCreateDialog}>
                  Add New Spare Part
                </Button>
              ) : (
                <Chip icon={<FaBoxes />} label={`${total} items`} color="primary" variant="outlined" />
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
                <TableCell sx={{ fontWeight: 700, width: 100 }}>Sort Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? renderSkeletonRows : sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 6 }}>
                    <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      <FaBoxes style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
                      <Typography variant="body1">No spare parts found</Typography>
                      <Typography variant="caption">Try adjusting your filters or create a new spare part.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : sortedItems.map((row) => {
                const qty = Number(row.quantity) || 0;
                const status = getStockStatusInfo(qty, row.movementClassification);
                const catName = typeof row.category === 'object' ? row.category?.name : row.category;
                const isEditingSort = editingSortId === row._id;

                return (
                  <TableRow key={row._id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {/* Sort Order cell — Task #46 */}
                    <TableCell sx={{ width: 130 }}>
                      {isEditingSort ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TextField
                            inputRef={sortInputRef}
                            size="small"
                            type="number"
                            value={editingSortValue}
                            onChange={(e) => setEditingSortValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditSort(row);
                              if (e.key === 'Escape') cancelEditSort();
                            }}
                            InputProps={{ inputProps: { min: 0, step: 1 } }}
                            sx={{ width: 70 }}
                          />
                          <Tooltip title="Save">
                            <IconButton size="small" color="success" onClick={() => saveEditSort(row)}><FaSave fontSize={12} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton size="small" color="default" onClick={cancelEditSort}><FaTimes fontSize={12} /></IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Tooltip title={isAdmin ? 'Click to edit sort order' : ''}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={isAdmin ? { cursor: 'pointer', '&:hover': { color: 'primary.main', textDecoration: 'underline' } } : {}}
                            onClick={isAdmin ? () => startEditSort(row) : undefined}
                          >
                            {row.sortOrder ?? 0}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                    </TableCell>
                    <TableCell>{catName || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{qty.toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <Chip label={status.label} color={status.color} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined" color="primary" startIcon={<FaEllipsisV />}
                        onClick={() => openActionDialog(row)}>
                        Action
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[50]}
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
            <Typography variant="h6" fontWeight={700}>Choose Action</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button variant="contained" color="success" startIcon={<FaArrowDown />}
              onClick={() => { closeActionDialog(); openStockDialog(selectedPart, 'in'); }}>
              Stock In
            </Button>
            <Button variant="contained" color="warning" startIcon={<FaArrowUp />}
              onClick={() => { closeActionDialog(); openStockDialog(selectedPart, 'out'); }}>
              Stock Out
            </Button>
            <Button variant="outlined" color="primary"
              onClick={() => { closeActionDialog(); openEditDialog(selectedPart); }}>
              Edit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeActionDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onClose={submitting ? undefined : closeDialog} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaBoxes />
            <Typography variant="h6" fontWeight={700}>{editingId ? 'Edit Spare Part' : 'New Spare Part'}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Name *" value={formData.name}
                onChange={(e) => setField('name', e.target.value)}
                error={!!formErrors.name} helperText={formErrors.name} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.category}>
                <InputLabel id="sp-form-category-label">Category *</InputLabel>
                <Select labelId="sp-form-category-label" label="Category *" value={formData.category}
                  onChange={(e) => setField('category', e.target.value)} disabled={categoriesLoading}>
                  <MenuItem value=""><em>{categoriesLoading ? 'Loading categories...' : 'Select category'}</em></MenuItem>
                  {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                </Select>
                {formErrors.category && (
                  <Typography variant="caption" color="error" sx={{ px: 1.75, pt: 0.5 }}>{formErrors.category}</Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="sp-form-status-label">Status</InputLabel>
                <Select labelId="sp-form-status-label" label="Status" value={formData.status}
                  onChange={(e) => setField('status', e.target.value)}>
                  {SPARE_PART_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="sp-form-movement-label">Movement Classification</InputLabel>
                <Select labelId="sp-form-movement-label" label="Movement Classification"
                  value={formData.movementClassification}
                  onChange={(e) => setField('movementClassification', e.target.value)}>
                  <MenuItem value="fast">Fast Moving</MenuItem>
                  <MenuItem value="medium">Medium Moving</MenuItem>
                  <MenuItem value="low">Low Moving</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Quantity *" type="number" value={formData.quantity}
                onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setField('quantity', v); }}
                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                error={!!formErrors.quantity} helperText={formErrors.quantity}
                InputProps={{ inputProps: { min: 0, step: 1 } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || Number(v) >= 0) setField('sortOrder', v === '' ? '' : Number(v));
                }}
                onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
                helperText="Controls display order in the table (lower = appears first)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}>
            {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Stock In / Stock Out dialog ── */}
      <Dialog open={stockDialogOpen} onClose={stockSubmitting ? undefined : closeStockDialog} maxWidth="xs" fullWidth>
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
              {selectedPart?.quantity !== undefined && (
                <> &nbsp;·&nbsp; Current Qty: {selectedPart.quantity}</>
              )}
            </Typography>

            <TextField fullWidth label="Date" type="date" value={stockDate}
              onChange={(e) => setStockDate(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} required />

            {/* Stock Out only — restore Department, Machine, Requested By */}
            {stockAction === 'out' && (
              <>
                <TextField fullWidth label="Department" value={stockDepartment}
                  onChange={(e) => setStockDepartment(e.target.value)} sx={{ mt: 2 }} required />
                <TextField fullWidth label="Machine" value={stockMachine}
                  onChange={(e) => setStockMachine(e.target.value)} sx={{ mt: 2 }} required
                  helperText={selectedPart?.machine ? `Prefilled from part: ${selectedPart.machine}` : undefined} />
                <TextField fullWidth label="Requested By" value={stockRequestedBy}
                  onChange={(e) => setStockRequestedBy(e.target.value)} sx={{ mt: 2 }} required />
              </>
            )}

            <TextField fullWidth label="Quantity" type="number" value={stockQty}
              onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setStockQty(v); }}
              onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
              InputProps={{ inputProps: { min: 1, step: 1 } }} sx={{ mt: 2 }} required
              error={!!stockQty && Number(stockQty) <= 0}
              helperText={!!stockQty && Number(stockQty) <= 0 ? 'Quantity must be at least 1' : ''} />

            <TextField fullWidth label="Remarks" value={stockRemarks}
              onChange={(e) => setStockRemarks(e.target.value)} multiline rows={2} sx={{ mt: 2 }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeStockDialog} disabled={stockSubmitting}>Cancel</Button>
          <Button variant="contained" color={stockAction === 'in' ? 'success' : 'warning'}
            onClick={submitStock} disabled={stockSubmitting}>
            {stockSubmitting ? 'Saving...' : stockAction === 'in' ? 'Stock In' : 'Stock Out'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SparePartsPage;
