import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import { FaPlus, FaEdit, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import * as categoryApi from '../services/categoryApi';
import { getAllSpareParts } from '../services/sparePartApi';

const statusColors = {
  active: 'success',
  inactive: 'warning',
  archived: 'error',
};

const statusOptions = ['active', 'inactive', 'archived'];

const CategoriesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [sparePartCounts, setSparePartCounts] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    machine: '',
    sortOrder: 0,
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const response = await categoryApi.getAllCategories(params);
      const payload = response?.data ?? response;
      const data = Array.isArray(payload) ? payload : payload?.data ?? [];
      setCategories(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSparePartCounts = async () => {
    try {
      const response = await getAllSpareParts({ limit: 9999 });
      const payload = response?.data ?? response;
      const parts = Array.isArray(payload) ? payload : payload?.data ?? [];
      const counts = {};
      parts.forEach((part) => {
        const catId = part.categoryId || part.category?._id || part.category?.id;
        if (catId) {
          counts[catId] = (counts[catId] || 0) + 1;
        }
      });
      setSparePartCounts(counts);
    } catch (error) {
      console.error('Failed to fetch spare parts counts', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSparePartCounts();
  }, [search, statusFilter]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      machine: '',
      sortOrder: 0,
      status: 'active',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      machine: category.machine || '',
      sortOrder: category.sortOrder ?? 0,
      status: category.status || 'active',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!formLoading) setDialogOpen(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    const sortVal = Number(formData.sortOrder);
    if (!isNaN(sortVal) && sortVal < 0) {
      errors.sortOrder = 'Sort order must be zero or positive';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      let response;
      if (editingCategory) {
        response = await categoryApi.updateCategory(
          editingCategory._id || editingCategory.id,
          formData
        );
      } else {
        response = await categoryApi.createCategory(formData);
      }
      toast.success(response.message || (editingCategory ? 'Category updated' : 'Category created'));
      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save category');
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const sa = a.sortOrder ?? 0;
      const sb = b.sortOrder ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories]);

  const paginatedCategories = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedCategories.slice(start, start + rowsPerPage);
  }, [sortedCategories, page, rowsPerPage]);

  const renderTableSkeleton = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 5 }).map((__, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Spare Parts Categories
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage categories for organizing spare parts by type and machine.
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or machine..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: <FaSearch style={{ marginRight: 8, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Category Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Category Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<FaPlus />}
                  onClick={handleOpenCreate}
                  sx={{ ml: 1 }}
                >
                  New Category
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Machine</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Sort Order</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                renderTableSkeleton()
              ) : paginatedCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" color="text.secondary">
                      No categories found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCategories.map((category) => {
                  const catId = category._id || category.id;
                  const count = sparePartCounts[catId] || 0;
                  return (
                    <TableRow key={catId} hover>
                      <TableCell>
                        <Typography fontWeight={500}>
                          {category.name || '-'}
                          {count > 0 && (
                            <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 0.5 }}>
                              ({count})
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>{category.machine || '-'}</TableCell>
                      <TableCell>{category.sortOrder ?? 0}</TableCell>
                      <TableCell>
                        <Chip
                          label={(category.status || 'active').charAt(0).toUpperCase() + (category.status || 'active').slice(1)}
                          color={statusColors[category.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {isAdmin && (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(category)}>
                                <FaEdit />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sortedCategories.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
                disabled={formLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={formLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Machine"
                placeholder="e.g. CNC Machine, Lathe, Press"
                value={formData.machine}
                onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
                disabled={formLoading}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Sort Order"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  const safe = isNaN(parsed) ? 0 : Math.max(0, parsed);
                  setFormData({ ...formData, sortOrder: safe });
                  if (formErrors.sortOrder) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.sortOrder;
                      return next;
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (/-/.test(pasted)) {
                    e.preventDefault();
                    const cleaned = pasted.replace(/-/g, '');
                    const parsed = parseInt(cleaned, 10);
                    const safe = isNaN(parsed) ? 0 : Math.max(0, parsed);
                    setFormData({ ...formData, sortOrder: safe });
                  }
                }}
                disabled={formLoading}
                error={!!formErrors.sortOrder}
                helperText={formErrors.sortOrder || 'Zero or positive integer only'}
                InputProps={{ inputProps: { min: 0, step: 1 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth disabled={formLoading}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} disabled={formLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={formLoading}>
            {formLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage;

