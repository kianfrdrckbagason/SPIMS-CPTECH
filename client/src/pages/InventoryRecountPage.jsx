import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  FormControl, Grid, IconButton, InputLabel, LinearProgress, MenuItem,
  Paper, Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip,
} from '@mui/material';
import {
  FaPlus, FaClipboardCheck, FaCheckCircle, FaExclamationTriangle,
  FaPrint, FaTrash, FaArrowLeft, FaSyncAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import * as recountApi from '../services/inventoryRecountApi';
import * as categoryApi from '../services/categoryApi';

const STATUS_COLOR = { draft: 'default', in_progress: 'warning', completed: 'success' };
const STATUS_LABEL = { draft: 'Draft', in_progress: 'In Progress', completed: 'Completed' };

// ── Session list view ─────────────────────────────────────────────────────────
const RecountList = ({ onOpen, onNew, isAdmin }) => {
  const [recounts, setRecounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecounts = async () => {
    setLoading(true);
    try {
      const res = await recountApi.getRecounts({ limit: 50 });
      if (res?.success) setRecounts(res.data || []);
    } catch { toast.error('Failed to load recount sessions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecounts(); }, []);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Recount?', text: 'This draft will be permanently deleted.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d32f2f', cancelButtonColor: '#757575',
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const res = await recountApi.deleteRecount(id);
      if (res?.success) { toast.success('Recount deleted'); fetchRecounts(); }
      else toast.error(res?.message || 'Delete failed');
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Inventory Recount</Typography>
          <Typography variant="body1" color="text.secondary">
            Biweekly physical inventory recount sessions.
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<FaPlus />} onClick={onNew}>
            New Recount
          </Button>
        )}
      </Stack>

      {loading ? <LinearProgress /> : recounts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FaClipboardCheck style={{ fontSize: 40, opacity: 0.3, marginBottom: 8 }} />
          <Typography color="text.secondary">No recount sessions yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Recount Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Discrepancies</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recounts.map((r) => {
                const discrepancies = r.items?.filter((i) => i.status === 'discrepancy').length ?? 0;
                return (
                  <TableRow key={r._id} hover>
                    <TableCell>{dayjs(r.recountDate).format('MMM DD, YYYY')}</TableCell>
                    <TableCell>{r.title || '—'}</TableCell>
                    <TableCell>{r.category?.name || 'All Categories'}</TableCell>
                    <TableCell align="center">{r.items?.length ?? 0}</TableCell>
                    <TableCell align="center">
                      {discrepancies > 0
                        ? <Chip label={discrepancies} color="error" size="small" />
                        : <Chip label="0" color="success" size="small" variant="outlined" />}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={STATUS_LABEL[r.status]} color={STATUS_COLOR[r.status]} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Open">
                        <IconButton size="small" color="primary" onClick={() => onOpen(r._id)}>
                          <FaClipboardCheck />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && r.status === 'draft' && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(r._id)}>
                            <FaTrash />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

// ── Active recount count-entry view ──────────────────────────────────────────
const RecountDetail = ({ recountId, onBack, isAdmin }) => {
  const [recount, setRecount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [localCounts, setLocalCounts] = useState({});
  const [completeDialog, setCompleteDialog] = useState(false);
  const [checkedBy, setCheckedBy] = useState('');
  const [completeRemarks, setCompleteRemarks] = useState('');

  const fetchRecount = async () => {
    setLoading(true);
    try {
      const res = await recountApi.getRecountById(recountId);
      if (res?.success) {
        setRecount(res.data);
        const init = {};
        res.data.items.forEach((item) => {
          init[item._id] = item.actualQty !== null ? String(item.actualQty) : '';
        });
        setLocalCounts(init);
      }
    } catch { toast.error('Failed to load recount'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecount(); }, [recountId]);

  const handleSaveCounts = async () => {
    const counts = Object.entries(localCounts)
      .filter(([, v]) => v !== '' && v !== null)
      .map(([itemId, actualQty]) => ({ itemId, actualQty: Number(actualQty) }));
    if (counts.length === 0) { toast.error('Enter at least one actual count'); return; }
    setSaving(true);
    try {
      const res = await recountApi.submitCounts(recountId, counts);
      if (res?.success) { toast.success('Counts saved'); setRecount(res.data); }
      else toast.error(res?.message || 'Save failed');
    } catch (err) { toast.error(err?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await recountApi.completeRecount(recountId, { checkedBy, remarks: completeRemarks });
      if (res?.success) {
        toast.success('Recount completed');
        setRecount(res.data);
        setCompleteDialog(false);
      } else toast.error(res?.message || 'Failed to complete');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to complete'); }
    finally { setSaving(false); }
  };

  const handleAdjust = async (itemId) => {
    const result = await Swal.fire({
      title: 'Apply Adjustment?',
      text: 'This will update the spare part quantity to the actual count and create an adjustment transaction.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#1976d2', cancelButtonColor: '#757575',
      confirmButtonText: 'Apply', cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      const res = await recountApi.applyAdjustment(recountId, itemId);
      if (res?.success) { toast.success(res.message); fetchRecount(); }
      else toast.error(res?.message || 'Adjustment failed');
    } catch (err) { toast.error(err?.response?.data?.message || 'Adjustment failed'); }
    finally { setSaving(false); }
  };

  const allCounted = useMemo(() => {
    if (!recount) return false;
    return recount.items.every((i) => i.actualQty !== null);
  }, [recount]);

  if (loading) return <LinearProgress />;
  if (!recount) return null;

  const isCompleted = recount.status === 'completed';
  const discrepancies = recount.items.filter((i) => i.status === 'discrepancy');
  const matched = recount.items.filter((i) => i.status === 'matched');

  if (printMode) {
    return (
      <Box className="report-print-area">
        <Button className="report-controls" variant="outlined" startIcon={<FaArrowLeft />}
          onClick={() => setPrintMode(false)} sx={{ mb: 2 }}>Back</Button>
        <Paper elevation={0} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={800}>SPIMS-CPTECH</Typography>
            <Typography variant="subtitle1" fontWeight={600}>BIWEEKLY INVENTORY RECOUNT</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body1" fontWeight={600}>
              Recount Date: {dayjs(recount.recountDate).format('MMMM DD, YYYY')}
            </Typography>
            {recount.category?.name && <Typography>Category: {recount.category.name}</Typography>}
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Part</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>System Qty</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Actual Count</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Difference</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recount.items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.sparePart?.category?.name || '—'}</TableCell>
                    <TableCell>{item.sparePart?.name || '—'}</TableCell>
                    <TableCell align="center">{item.systemQty}</TableCell>
                    <TableCell align="center">{item.actualQty ?? '—'}</TableCell>
                    <TableCell align="center" sx={{ color: item.difference < 0 ? 'error.main' : item.difference > 0 ? 'success.main' : 'inherit', fontWeight: 600 }}>
                      {item.difference !== null ? (item.difference > 0 ? `+${item.difference}` : item.difference) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.status === 'matched' ? 'Matched' : item.status === 'discrepancy' ? 'Discrepancy' : 'Pending'}
                        color={item.status === 'matched' ? 'success' : item.status === 'discrepancy' ? 'error' : 'default'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 6 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={4} sx={{ mt: 4 }}>
              {[`Prepared by: ${recount.preparedBy || '___________________'}`, `Checked by: ${recount.checkedBy || '___________________'}`].map((label) => (
                <Box key={label} sx={{ textAlign: 'center', flex: 1 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, minWidth: 160 }} />
                  <Typography variant="body2" fontWeight={600}>{label}</Typography>
                  <Typography variant="caption" color="text.secondary">Signature / Date</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <IconButton onClick={onBack}><FaArrowLeft /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {recount.title || `Recount — ${dayjs(recount.recountDate).format('MMMM DD, YYYY')}`}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip label={STATUS_LABEL[recount.status]} color={STATUS_COLOR[recount.status]} size="small" />
            <Chip label={`${recount.items.length} items`} size="small" variant="outlined" />
            <Chip label={`${matched.length} matched`} color="success" size="small" variant="outlined" />
            {discrepancies.length > 0 && <Chip label={`${discrepancies.length} discrepancy`} color="error" size="small" />}
          </Stack>
        </Box>
        <Button variant="outlined" startIcon={<FaPrint />} onClick={() => setPrintMode(true)}>Print</Button>
        {!isCompleted && isAdmin && (
          <Button variant="outlined" startIcon={<FaSyncAlt />} onClick={handleSaveCounts} disabled={saving}>
            {saving ? 'Saving...' : 'Save Counts'}
          </Button>
        )}
        {!isCompleted && isAdmin && allCounted && (
          <Button variant="contained" color="success" startIcon={<FaCheckCircle />}
            onClick={() => setCompleteDialog(true)} disabled={saving}>
            Complete Recount
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Part</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>System Qty</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actual Count</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Difference</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
              {isAdmin && <TableCell align="center" sx={{ fontWeight: 700 }}>Adjustment</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {recount.items.map((item) => (
              <TableRow key={item._id} hover sx={{ bgcolor: item.status === 'discrepancy' ? 'rgba(211,47,47,0.04)' : 'inherit' }}>
                <TableCell>{item.sparePart?.category?.name || '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{item.sparePart?.name || '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.sparePart?.sku || ''}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>{item.systemQty}</TableCell>
                <TableCell align="center" sx={{ width: 130 }}>
                  {isCompleted ? (
                    <Typography fontWeight={600}>{item.actualQty ?? '—'}</Typography>
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      value={localCounts[item._id] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || Number(v) >= 0)
                          setLocalCounts((prev) => ({ ...prev, [item._id]: v }));
                      }}
                      onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      sx={{ width: 90 }}
                    />
                  )}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: item.difference < 0 ? 'error.main' : item.difference > 0 ? 'success.main' : 'text.primary' }}>
                  {item.difference !== null ? (item.difference > 0 ? `+${item.difference}` : item.difference) : '—'}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={item.status === 'matched' ? 'Matched' : item.status === 'discrepancy' ? 'Discrepancy' : 'Pending'}
                    color={item.status === 'matched' ? 'success' : item.status === 'discrepancy' ? 'error' : 'default'}
                    size="small"
                    icon={item.status === 'discrepancy' ? <FaExclamationTriangle style={{ fontSize: 11 }} /> : undefined}
                  />
                </TableCell>
                {isAdmin && (
                  <TableCell align="center">
                    {item.status === 'discrepancy' && !item.adjustmentCreated && (
                      <Tooltip title="Apply inventory adjustment">
                        <Button size="small" variant="outlined" color="warning" onClick={() => handleAdjust(item._id)} disabled={saving}>
                          Adjust
                        </Button>
                      </Tooltip>
                    )}
                    {item.adjustmentCreated && <Chip label="Adjusted" color="info" size="small" variant="outlined" />}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Complete dialog */}
      <Dialog open={completeDialog} onClose={() => setCompleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete Recount</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              All items have been counted. Finalize this recount session.
            </Typography>
            <TextField fullWidth label="Checked By" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} />
            <TextField fullWidth label="Remarks" value={completeRemarks} onChange={(e) => setCompleteRemarks(e.target.value)} multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteDialog(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleComplete} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Completing...' : 'Complete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── New recount dialog ────────────────────────────────────────────────────────
const NewRecountDialog = ({ open, onClose, onCreated }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    recountDate: new Date().toISOString().slice(0, 10),
    title: '',
    category: '',
    preparedBy: user?.fullName || '',
    checkedBy: '',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    categoryApi.getAllCategories({ status: 'active' })
      .then((res) => setCategories(res?.data || []))
      .catch(() => {});
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        category: form.category || undefined,
      };
      const res = await recountApi.createRecount(payload);
      if (res?.success) {
        toast.success(`Recount session created with ${res.data.items.length} items`);
        onCreated(res.data._id);
      } else {
        toast.error(res?.message || 'Failed to create recount');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create recount');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FaClipboardCheck />
          <Typography variant="h6" fontWeight={700}>New Recount Session</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Recount Date" type="date" value={form.recountDate}
              onChange={(e) => setForm({ ...form, recountDate: e.target.value })}
              InputLabelProps={{ shrink: true }} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="nr-cat-label">Category (optional)</InputLabel>
              <Select labelId="nr-cat-label" label="Category (optional)" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Title (optional)" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. August Biweekly Recount #1" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Prepared By" value={form.preparedBy}
              onChange={(e) => setForm({ ...form, preparedBy: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Checked By" value={form.checkedBy}
              onChange={(e) => setForm({ ...form, checkedBy: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Remarks" value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })} multiline rows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <FaPlus />}>
          {submitting ? 'Creating...' : 'Create Recount'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Root page ─────────────────────────────────────────────────────────────────
const InventoryRecountPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeRecountId, setActiveRecountId] = useState(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  if (activeRecountId) {
    return (
      <RecountDetail
        recountId={activeRecountId}
        onBack={() => setActiveRecountId(null)}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <Box>
      <RecountList
        onOpen={(id) => setActiveRecountId(id)}
        onNew={() => setNewDialogOpen(true)}
        isAdmin={isAdmin}
      />
      <NewRecountDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreated={(id) => { setNewDialogOpen(false); setActiveRecountId(id); }}
      />
    </Box>
  );
};

export default InventoryRecountPage;
