import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
} from '@mui/material';
import { FaCalendarAlt, FaExclamationTriangle, FaHandHolding, FaTools } from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as borrowedToolApi from '../services/borrowedToolApi';

const statusStyles = {
  available: 'success',
  borrowed: 'warning',
  returned: 'info',
  lost: 'error',
  damaged: 'secondary',
};

const sampleTools = [
  {
    _id: 'demo-1',
    tool: 'Torque Wrench',
    borrower: 'Rafael Cruz',
    department: 'Maintenance',
    borrowDate: '2026-07-29',
    expectedReturnDate: '2026-08-02',
    returnDate: '',
    status: 'borrowed',
    condition: 'Good',
    remarks: 'Requested for press maintenance',
  },
  {
    _id: 'demo-2',
    tool: 'Digital Multimeter',
    borrower: 'Nina Dela Cruz',
    department: 'Production',
    borrowDate: '2026-07-22',
    expectedReturnDate: '2026-07-28',
    returnDate: '2026-07-28',
    status: 'returned',
    condition: 'Good',
    remarks: 'Returned after electrical check',
  },
];

const BorrowedToolsPage = () => {
  const [rows, setRows] = useState(sampleTools);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await borrowedToolApi.getAllBorrowedTools({
          status: statusFilter === 'all' ? undefined : statusFilter,
        });
        if (active && response?.success) {
          setRows(response.data?.length ? response.data : sampleTools);
        }
      } catch (error) {
        if (active) {
          setRows(sampleTools);
          toast.info('Showing demo borrowed tool data while the API is offline.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const filteredRows = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesQuery =
        !query ||
        [row.tool, row.borrower, row.department, row.condition, row.remarks]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [rows, search, statusFilter]);

  const handleReturn = async (id) => {
    try {
      await borrowedToolApi.returnBorrowedTool(id, {
        returnDate: new Date().toISOString(),
        status: 'returned',
      });
      setRows((current) => current.map((item) => (item._id === id ? { ...item, status: 'returned', returnDate: new Date().toISOString().slice(0, 10) } : item)));
      toast.success('Tool marked returned.');
    } catch (error) {
      toast.error('Unable to update the tool status right now.');
    }
  };

  const stats = useMemo(() => {
    const overdue = rows.filter((row) => row.status === 'borrowed' && row.expectedReturnDate && new Date(row.expectedReturnDate) < new Date()).length;
    return {
      total: rows.length,
      borrowed: rows.filter((row) => row.status === 'borrowed').length,
      overdue,
      available: rows.filter((row) => row.status === 'available').length,
    };
  }, [rows]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Borrowed Tools Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track tool loans, expected returns, and overdue equipment in one place.
          </Typography>
        </Box>
        <Chip label="Live CPTECH operations" color="primary" variant="outlined" />
      </Stack>

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total records', value: stats.total, icon: <FaTools /> },
          { label: 'Currently borrowed', value: stats.borrowed, icon: <FaHandHolding /> },
          { label: 'Overdue', value: stats.overdue, icon: <FaExclamationTriangle /> },
          { label: 'Available', value: stats.available, icon: <FaCalendarAlt /> },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="h5" fontWeight={700}>{item.value}</Typography>
                  </Box>
                  <Box color="primary.main" fontSize={24}>{item.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField label="Search tools" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth size="small" />
          <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 180 }}>
            <MenuItem value="all">All statuses</MenuItem>
            <MenuItem value="borrowed">Borrowed</MenuItem>
            <MenuItem value="returned">Returned</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="damaged">Damaged</MenuItem>
            <MenuItem value="lost">Lost</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {loading ? (
        <Alert severity="info">Loading borrowed tools…</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tool</TableCell>
                <TableCell>Borrower</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Borrowed</TableCell>
                <TableCell>Expected Return</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row._id} hover>
                  <TableCell>{row.tool}</TableCell>
                  <TableCell>{row.borrower}</TableCell>
                  <TableCell>{row.department}</TableCell>
                  <TableCell>{row.borrowDate}</TableCell>
                  <TableCell>{row.expectedReturnDate}</TableCell>
                  <TableCell>
                    <Chip label={row.status} color={statusStyles[row.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    {row.status === 'borrowed' ? (
                      <Button size="small" variant="outlined" onClick={() => handleReturn(row._id)}>
                        Mark returned
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Completed</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BorrowedToolsPage;
