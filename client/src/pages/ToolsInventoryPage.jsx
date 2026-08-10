import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  FaPlus,
  FaTools,
  FaWrench,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaShareSquare,
  FaSearch,
  FaUndo,
  FaHammer,
  FaQuestionCircle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import * as toolApi from '../services/toolApi';
import * as borrowedToolApi from '../services/borrowedToolApi';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const sampleTools = [
  { _id: 'tool-1', name: 'SET OF OPEN WRENCH', category: 'Mechanical', status: 'available', location: 'Tool Room', condition: 'good', toolCode: 'SOW-001' },
  { _id: 'tool-2', name: 'PULLER', category: 'Mechanical', status: 'available', location: 'Tool Room', condition: 'good', toolCode: 'PUL-002' },
  { _id: 'tool-3', name: 'CALIPER', category: 'Measurement', status: 'available', location: 'Tool Room', condition: 'good', toolCode: 'CAL-003' },
];

const statusStyles = {
  available: 'success',
  borrowed: 'warning',
  maintenance: 'info',
  damaged: 'error',
  lost: 'secondary',
  retired: 'default',
};

const statusLabels = {
  available: 'Available',
  borrowed: 'Borrowed',
  maintenance: 'Under Maintenance',
  damaged: 'Damaged',
  lost: 'Lost',
  retired: 'Retired',
};

const borrowStatusStyles = {
  borrowed: 'warning',
  returned: 'success',
  overdue: 'error',
  lost: 'secondary',
  damaged: 'error',
};

const conditionOptions = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost', label: 'Lost' },
];

const ToolsInventoryPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tools, setTools] = useState(sampleTools);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // View details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Borrow dialog
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [borrowForm, setBorrowForm] = useState({
    borrowerName: '',
    department: '',
    borrowDate: dayjs().format('YYYY-MM-DD'),
    expectedReturnDate: '',
    remarks: '',
  });
  const [borrowSubmitting, setBorrowSubmitting] = useState(false);

  // Return dialog
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [activeBorrowedTool, setActiveBorrowedTool] = useState(null);
  const [returnForm, setReturnForm] = useState({
    actualReturnDate: dayjs().format('YYYY-MM-DD'),
    toolConditionOnReturn: 'good',
    remarks: '',
  });
  const [returnSubmitting, setReturnSubmitting] = useState(false);

// Status action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Add Tool dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
const [addForm, setAddForm] = useState({
    name: '',
    category: '',
    condition: 'good',
    status: 'available',
  });
  const [addFormErrors, setAddFormErrors] = useState({});

  const fetchTools = useCallback(async () => {
    try {
      const response = await toolApi.getAllTools({});
      if (response?.success && response.data?.length) {
        setTools(response.data);
      }
    } catch (error) {
      // keep existing tools
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await toolApi.getAllTools({});
        if (active && response?.success) {
          setTools(response.data?.length ? response.data : sampleTools);
        }
      } catch (error) {
        if (active) {
          setTools(sampleTools);
          toast.info('Showing a demo tool inventory while the API is offline.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const fetchBorrowHistory = useCallback(async (toolId) => {
    setHistoryLoading(true);
    try {
      const response = await borrowedToolApi.getAllBorrowedTools({
        tool: toolId,
        limit: 50,
        sort: '-borrowDate',
      });
      if (response?.success) {
        setBorrowHistory(response.data || []);
      } else {
        setBorrowHistory([]);
      }
    } catch (error) {
      setBorrowHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshSelectedTool = useCallback(async () => {
    if (!selectedTool?._id) return;
    try {
      const response = await toolApi.getToolById(selectedTool._id);
      if (response?.success && response.data) {
        setSelectedTool(response.data);
      }
    } catch (error) {
      // keep existing
    }
  }, [selectedTool?._id]);

  const filteredTools = useMemo(() => {
    const query = search.toLowerCase();
    return tools.filter((tool) => {
      const matchesStatus = statusFilter === 'all' || tool.status === statusFilter;
      const matchesQuery =
        !query ||
        [tool.name, tool.category, tool.location, tool.toolCode]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [tools, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: tools.length,
      available: tools.filter((t) => t.status === 'available').length,
      borrowed: tools.filter((t) => t.status === 'borrowed').length,
      maintenance: tools.filter((t) => t.status === 'maintenance').length,
      damaged: tools.filter((t) => t.status === 'damaged').length,
    }),
    [tools]
  );

  const getActiveBorrowedTool = () => {
    return borrowHistory.find((bt) => bt.status === 'borrowed' || bt.status === 'overdue');
  };

  // ---- View Details ----
  const handleViewDetails = (tool) => {
    setSelectedTool(tool);
    setViewDialogOpen(true);
    fetchBorrowHistory(tool._id);
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedTool(null);
    setBorrowHistory([]);
  };

  // ---- Borrow Tool ----
  const handleBorrowTool = (tool) => {
    if (tool.status === 'borrowed') {
      toast.error('This tool is already borrowed');
      return;
    }
    if (tool.status === 'maintenance') {
      toast.error('This tool is under maintenance and cannot be borrowed');
      return;
    }
    if (tool.status === 'damaged' || tool.status === 'lost' || tool.status === 'retired') {
      toast.error(`This tool is ${statusLabels[tool.status] || tool.status} and cannot be borrowed`);
      return;
    }
    setSelectedTool(tool);
    setBorrowForm({
      borrowerName: user?.fullName || '',
      department: '',
      borrowDate: dayjs().format('YYYY-MM-DD'),
      expectedReturnDate: '',
      remarks: '',
    });
    setBorrowDialogOpen(true);
  };

  const closeBorrowDialog = () => {
    setBorrowDialogOpen(false);
  };

  const handleBorrowSubmit = async () => {
    if (!borrowForm.borrowerName.trim()) {
      toast.error('Borrower name is required');
      return;
    }
    if (!borrowForm.department.trim()) {
      toast.error('Department is required');
      return;
    }
    if (!borrowForm.expectedReturnDate) {
      toast.error('Expected return date is required');
      return;
    }

    setBorrowSubmitting(true);
    try {
      await borrowedToolApi.borrowTool({
        tool: selectedTool._id,
        borrowerName: borrowForm.borrowerName.trim(),
        department: borrowForm.department.trim(),
        quantity: 1,
        borrowDate: borrowForm.borrowDate,
        expectedReturnDate: borrowForm.expectedReturnDate,
        toolConditionOnBorrow: selectedTool.condition || 'good',
        remarks: borrowForm.remarks.trim(),
      });
      toast.success('Tool borrowed successfully');
      setBorrowDialogOpen(false);
      await fetchTools();
      await refreshSelectedTool();
      await fetchBorrowHistory(selectedTool._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to borrow tool');
    } finally {
      setBorrowSubmitting(false);
    }
  };

  // ---- Return Tool ----
  const handleReturnTool = () => {
    const active = getActiveBorrowedTool();
    if (!active) {
      toast.error('No active borrowing record found for this tool');
      return;
    }
    setActiveBorrowedTool(active);
    setReturnForm({
      actualReturnDate: dayjs().format('YYYY-MM-DD'),
      toolConditionOnReturn: 'good',
      remarks: '',
    });
    setReturnDialogOpen(true);
  };

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setActiveBorrowedTool(null);
  };

  const handleReturnSubmit = async () => {
    if (!activeBorrowedTool?._id) {
      toast.error('No active borrowing record found');
      return;
    }

    setReturnSubmitting(true);
    try {
      await borrowedToolApi.returnBorrowedTool(activeBorrowedTool._id, {
        actualReturnDate: returnForm.actualReturnDate,
        toolConditionOnReturn: returnForm.toolConditionOnReturn,
        remarks: returnForm.remarks.trim(),
      });
      toast.success('Tool returned successfully');
      setReturnDialogOpen(false);
      await fetchTools();
      await refreshSelectedTool();
      await fetchBorrowHistory(selectedTool._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to return tool');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // ---- Status Change (maintenance, damaged, lost, available) ----
  const handleStatusChange = async (newStatus, label) => {
    if (!selectedTool) return;

    const result = await Swal.fire({
      title: 'Confirm Status Change',
      text: `Change "${selectedTool.name}" status to "${label}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1976d2',
      cancelButtonColor: '#757575',
      confirmButtonText: 'Yes, Update',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      await toolApi.updateTool(selectedTool._id, { status: newStatus });
      toast.success(`Tool status updated to ${label}`);
      await fetchTools();
      await refreshSelectedTool();
} catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update tool status');
    } finally {
      setActionLoading(false);
    }
  };

// ---- Add Tool ----
  const openAddDialog = () => {
    setAddForm({
      name: '',
      category: '',
      condition: 'good',
      status: 'available',
    });
    setAddFormErrors({});
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
  };

  const setAddField = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
    if (addFormErrors[field]) {
      setAddFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

const validateAddForm = () => {
    const errors = {};
    if (!addForm.name?.trim()) errors.name = 'Tool name is required';
    else if (addForm.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!addForm.category?.trim()) errors.category = 'Category is required';
    setAddFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async () => {
    if (!validateAddForm()) return;
    setAddSubmitting(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        toolCode: `TOOL-${Date.now()}`,
        category: addForm.category.trim(),
        condition: addForm.condition,
        status: addForm.status,
      };
      const res = await toolApi.createTool(payload);
      if (res?.success) {
        toast.success(res.message || 'Tool created successfully');
        setAddDialogOpen(false);
        await fetchTools();
      } else {
        if (res?.errors && Array.isArray(res.errors)) {
          const fieldErrors = {};
          res.errors.forEach((e) => {
            if (e.field) fieldErrors[e.field] = e.message;
          });
          if (Object.keys(fieldErrors).length) setAddFormErrors(fieldErrors);
        }
        toast.error(res?.message || 'Failed to create tool');
      }
    } catch (error) {
      const msg = error?.response?.data?.message;
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const fieldErrors = {};
        error.response.data.errors.forEach((e) => {
          if (e.field) fieldErrors[e.field] = e.message;
        });
        if (Object.keys(fieldErrors).length) setAddFormErrors(fieldErrors);
      }
      toast.error(msg || 'Failed to create tool');
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Tool Inventory
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Maintain a reliable view of tools that support maintenance and production teams.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                label="Search tools"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <FaSearch style={{ marginRight: 8, color: 'text.secondary' }} />,
                }}
              />
              <TextField
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="borrowed">Borrowed</MenuItem>
                <MenuItem value="maintenance">Under Maintenance</MenuItem>
                <MenuItem value="damaged">Damaged</MenuItem>
                <MenuItem value="lost">Lost</MenuItem>
              </TextField>
            </Stack>
          </Paper>
        </Grid>
<Grid item xs={12} md={4}>
          {isAdmin ? (
            <Button
              variant="contained"
              startIcon={<FaPlus />}
              fullWidth
              sx={{ height: '100%', minHeight: 42 }}
              onClick={openAddDialog}
            >
              Add New Tool
            </Button>
          ) : (
            <Chip
              icon={<FaWrench />}
              label={`${stats.total} registered tools`}
              color="primary"
              variant="outlined"
              sx={{ height: '100%', minHeight: 42, width: '100%', justifyContent: 'center' }}
            />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Registered Tools', value: stats.total, icon: <FaTools />, color: 'primary.main' },
          { label: 'Available Tools', value: stats.available, icon: <FaCheckCircle />, color: 'success.main' },
          { label: 'Borrowed Tools', value: stats.borrowed, icon: <FaShareSquare />, color: 'warning.main' },
          { label: 'Under Maintenance', value: stats.maintenance, icon: <FaWrench />, color: 'info.main' },
          { label: 'Damaged Tools', value: stats.damaged, icon: <FaExclamationTriangle />, color: 'error.main' },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={true} key={item.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {item.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color={item.color}>
                      {item.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      fontSize: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1,
                      bgcolor: item.color,
                      borderRadius: 2,
                      color: 'white',
                    }}
                  >
                    {item.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Alert severity="info">Loading tool inventory…</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Tool Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTools.map((tool) => (
                <TableRow key={tool._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {tool.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{tool.category}</TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[tool.status] || tool.status}
                      color={statusStyles[tool.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
<TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        width: '100%',
                      }}
                    >
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          color="primary"
                          sx={{ width: 32, height: 32 }}
                          onClick={() => handleViewDetails(tool)}
                        >
                          <FaEye fontSize={14} />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && (
                        <Tooltip title={tool.status === 'available' ? 'Borrow Tool' : 'Tool not available for borrow'}>
                          <IconButton
                            size="small"
                            color="warning"
                            sx={{ width: 32, height: 32 }}
                            onClick={() => handleBorrowTool(tool)}
                            disabled={tool.status !== 'available'}
                          >
                            <FaShareSquare fontSize={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={closeViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Tool Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTool && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Tool Information */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Tool Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Tool Name</Typography>
                    <Typography variant="body1" fontWeight={500}>{selectedTool.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Tool Code</Typography>
                    <Typography variant="body1" fontWeight={500}>{selectedTool.toolCode || selectedTool._id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Category</Typography>
                    <Typography variant="body1" fontWeight={500}>{selectedTool.category}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Current Location</Typography>
                    <Typography variant="body1" fontWeight={500}>{selectedTool.location}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Condition</Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedTool.condition
                        ? selectedTool.condition.charAt(0).toUpperCase() + selectedTool.condition.slice(1)
                        : 'Good'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={statusLabels[selectedTool.status] || selectedTool.status}
                        color={statusStyles[selectedTool.status] || 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  {selectedTool.brand && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Brand</Typography>
                      <Typography variant="body1" fontWeight={500}>{selectedTool.brand}</Typography>
                    </Grid>
                  )}
                  {selectedTool.model && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Model</Typography>
                      <Typography variant="body1" fontWeight={500}>{selectedTool.model}</Typography>
                    </Grid>
                  )}
                  {selectedTool.serialNumber && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                      <Typography variant="body1" fontWeight={500}>{selectedTool.serialNumber}</Typography>
                    </Grid>
                  )}
                  {selectedTool.dateAdded && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">Date Added</Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {dayjs(selectedTool.dateAdded || selectedTool.createdAt).format('MMMM D, YYYY')}
                      </Typography>
                    </Grid>
                  )}
                  {selectedTool.remarks && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Remarks</Typography>
                      <Typography variant="body1" fontWeight={500}>{selectedTool.remarks}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Status Management */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Status Management
                </Typography>

                {selectedTool.status === 'borrowed' ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<FaUndo />}
                      onClick={handleReturnTool}
                      disabled={actionLoading}
                    >
                      Return Tool
                    </Button>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      This tool is currently borrowed. Use Return Tool to mark it as available.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                    {selectedTool.status === 'available' && isAdmin && (
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<FaShareSquare />}
                        onClick={() => handleBorrowTool(selectedTool)}
                      >
                        Borrow Tool
                      </Button>
                    )}
                    {selectedTool.status !== 'available' && (
                      <Button
                        variant="outlined"
                        color="success"
                        startIcon={<FaCheckCircle />}
                        onClick={() => handleStatusChange('available', 'Available')}
                        disabled={actionLoading}
                      >
                        Mark as Available
                      </Button>
                    )}
                    {selectedTool.status !== 'maintenance' && (
                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<FaHammer />}
                        onClick={() => handleStatusChange('maintenance', 'Under Maintenance')}
                        disabled={actionLoading}
                      >
                        Send for Repair
                      </Button>
                    )}
                    {selectedTool.status !== 'damaged' && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<FaExclamationTriangle />}
                        onClick={() => handleStatusChange('damaged', 'Damaged')}
                        disabled={actionLoading}
                      >
                        Mark as Damaged
                      </Button>
                    )}
                    {selectedTool.status !== 'lost' && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<FaQuestionCircle />}
                        onClick={() => handleStatusChange('lost', 'Lost')}
                        disabled={actionLoading}
                      >
                        Mark as Lost
                      </Button>
                    )}
                  </Stack>
                )}
              </Box>

              <Divider />

              {/* Borrowing History */}
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Borrowing History
                </Typography>
                {historyLoading ? (
                  <Typography color="text.secondary">Loading history…</Typography>
                ) : borrowHistory.length === 0 ? (
                  <Typography color="text.secondary">No borrowing records found for this tool.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Borrower</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Borrow Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Expected Return</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Actual Return</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {borrowHistory.map((bt) => (
                          <TableRow key={bt._id} hover>
                            <TableCell>{bt.borrowerName}</TableCell>
                            <TableCell>{bt.department}</TableCell>
                            <TableCell>
                              {bt.borrowDate ? dayjs(bt.borrowDate).format('MMM D, YYYY') : '-'}
                            </TableCell>
                            <TableCell>
                              {bt.expectedReturnDate ? dayjs(bt.expectedReturnDate).format('MMM D, YYYY') : '-'}
                            </TableCell>
                            <TableCell>
                              {bt.actualReturnDate ? dayjs(bt.actualReturnDate).format('MMM D, YYYY') : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={bt.status}
                                color={borrowStatusStyles[bt.status] || 'default'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Borrow Tool Dialog */}
      <Dialog open={borrowDialogOpen} onClose={closeBorrowDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Borrow Tool
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTool && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {selectedTool.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTool.category} • {selectedTool.location}
                </Typography>
              </Box>
              <TextField
                fullWidth
                label="Borrower Name"
                value={borrowForm.borrowerName}
                onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Department"
                value={borrowForm.department}
                onChange={(e) => setBorrowForm({ ...borrowForm, department: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Borrow Date"
                type="date"
                value={borrowForm.borrowDate}
                onChange={(e) => setBorrowForm({ ...borrowForm, borrowDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="Expected Return Date"
                type="date"
                value={borrowForm.expectedReturnDate}
                onChange={(e) => setBorrowForm({ ...borrowForm, expectedReturnDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
                inputProps={{ min: borrowForm.borrowDate }}
              />
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={2}
                value={borrowForm.remarks}
                onChange={(e) => setBorrowForm({ ...borrowForm, remarks: e.target.value })}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBorrowDialog} disabled={borrowSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBorrowSubmit}
            disabled={borrowSubmitting}
          >
            {borrowSubmitting ? 'Processing...' : 'Borrow Tool'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Tool Dialog */}
      <Dialog open={returnDialogOpen} onClose={closeReturnDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Return Tool
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTool && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {selectedTool.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTool.category} • {selectedTool.location}
                </Typography>
                {activeBorrowedTool && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                    Borrowed by {activeBorrowedTool.borrowerName} ({activeBorrowedTool.department}) on{' '}
                    {activeBorrowedTool.borrowDate ? dayjs(activeBorrowedTool.borrowDate).format('MMM D, YYYY') : 'N/A'}
                  </Typography>
                )}
              </Box>
              <TextField
                fullWidth
                label="Actual Return Date"
                type="date"
                value={returnForm.actualReturnDate}
                onChange={(e) => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <FormControl fullWidth required>
                <InputLabel>Tool Condition on Return</InputLabel>
                <Select
                  value={returnForm.toolConditionOnReturn}
                  label="Tool Condition on Return"
                  onChange={(e) => setReturnForm({ ...returnForm, toolConditionOnReturn: e.target.value })}
                >
                  {conditionOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={2}
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReturnDialog} disabled={returnSubmitting}>
            Cancel
          </Button>
<Button
            variant="contained"
            color="success"
            onClick={handleReturnSubmit}
            disabled={returnSubmitting}
          >
            {returnSubmitting ? 'Processing...' : 'Return Tool'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tool Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={addSubmitting ? undefined : closeAddDialog}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaPlus />
            <Typography variant="h6" fontWeight={700}>
              Add New Tool
            </Typography>
          </Box>
        </DialogTitle>
<DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tool Name *"
                value={addForm.name}
                onChange={(e) => setAddField('name', e.target.value)}
                error={!!addFormErrors.name}
                helperText={addFormErrors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category *"
                value={addForm.category}
                onChange={(e) => setAddField('category', e.target.value)}
                error={!!addFormErrors.category}
                helperText={addFormErrors.category}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="add-tool-condition-label">Condition</InputLabel>
                <Select
                  labelId="add-tool-condition-label"
                  label="Condition"
                  value={addForm.condition}
                  onChange={(e) => setAddField('condition', e.target.value)}
                >
                  {conditionOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="add-tool-status-label">Status</InputLabel>
                <Select
                  labelId="add-tool-status-label"
                  label="Status"
                  value={addForm.status}
                  onChange={(e) => setAddField('status', e.target.value)}
                >
                  <MenuItem value="available">Available</MenuItem>
                  <MenuItem value="maintenance">Under Maintenance</MenuItem>
                  <MenuItem value="damaged">Damaged</MenuItem>
                  <MenuItem value="lost">Lost</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeAddDialog} disabled={addSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddSubmit}
            disabled={addSubmitting}
          >
            {addSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ToolsInventoryPage;
