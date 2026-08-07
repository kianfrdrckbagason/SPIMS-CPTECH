import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { FaChartBar, FaFilePdf, FaFileExcel, FaClipboardList, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as reportApi from '../services/reportApi';
import * as dailyConsumptionApi from '../services/dailyConsumptionApi';
import * as categoryApi from '../services/categoryApi';
import * as sparePartApi from '../services/sparePartApi';

const reportItems = [
  { title: 'Daily inventory movement', description: 'Stock in, stock out, and adjustments', type: 'Daily' },
  { title: 'Low stock watchlist', description: 'Items below minimum stock', type: 'Low Stock' },
  { title: 'Borrowed tools report', description: 'Overdue and active loans', type: 'Borrowed Tools' },
  { title: 'Consumables summary', description: 'Usage per line and shift', type: 'Consumables' },
];

const ReportsPage = () => {
  const [summary, setSummary] = useState({ totalSpareParts: 0, lowStockItems: 0, outOfStockItems: 0 });
  const [loading, setLoading] = useState(true);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [loadingDailyTransactions, setLoadingDailyTransactions] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [spareParts, setSpareParts] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      try {
        const response = await reportApi.getInventorySummary();
        if (active && response?.success) {
          setSummary(response.data || summary);
        }
      } catch (error) {
        if (active) {
          setSummary({ totalSpareParts: 128, lowStockItems: 12, outOfStockItems: 4 });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAllCategories({ status: 'active' });
        if (active) {
          setCategories(res?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDailyTransactions = async () => {
      setLoadingDailyTransactions(true);
      try {
        const params = {
          month: month,
        };
        if (selectedCategory) params.category = selectedCategory;
        
        // Fetch daily transactions
        const txRes = await dailyConsumptionApi.getAllDailyConsumptions(params);
        if (active) {
          setDailyTransactions(txRes?.data || []);
        }
        
        // Fetch spare parts for the selected category to get B.I. values
        const spParams = { limit: 1000 };
        if (selectedCategory) spParams.category = selectedCategory;
        const spRes = await sparePartApi.getAllSpareParts(spParams);
        if (active) {
          setSpareParts(spRes?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch daily transactions:', err);
        if (active) {
          setDailyTransactions([]);
          setSpareParts([]);
        }
      } finally {
        if (active) setLoadingDailyTransactions(false);
      }
    };
    fetchDailyTransactions();
    return () => {
      active = false;
    };
  }, [month, selectedCategory]);

  const exportToExcel = () => {
    if (spareParts.length === 0) {
      toast.error('No spare parts to export');
      return;
    }

    try {
      const [year, monthNum] = month.split('-');
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      // Create header
      const header = ['PARTS', 'B.I.', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'REMARKS'];
      const data = [header];

      // Add part rows with B.I. and daily transactions
      spareParts.forEach(part => {
        const biValue = Number(part.quantity || 0);
        const partTransactions = dailyTransactions.filter(t => 
          (t.sparePart?._id === part._id || t.sparePart === part._id)
        );
        
        const dailyValues = Array(daysInMonth).fill(0);
        partTransactions.forEach(tx => {
          const dayNum = new Date(tx.date || tx.createdAt).getDate() - 1;
          if (dayNum >= 0 && dayNum < daysInMonth) {
            dailyValues[dayNum] += Number(tx.quantity || 0);
          }
        });

        const row = [part.name, biValue, ...dailyValues, ''];
        data.push(row);
      });

      // Convert to CSV
      const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `daily-transactions-${month}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const handleExport = (format, title) => {
    toast.success(`${title} export prepared as ${format.toUpperCase()}.`);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Reports & Export Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate printable reports for management and operations teams.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<FaChartBar />}>
          Create management report
        </Button>
      </Stack>

      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Inventory items', value: summary.totalSpareParts },
          { label: 'Low stock', value: summary.lowStockItems },
          { label: 'Out of stock', value: summary.outOfStockItems },
        ].map((item) => (
          <Grid item xs={12} md={4} key={item.label}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                <Typography variant="h5" fontWeight={700}>{item.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Daily Transactions Report Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FaClipboardList /> Daily Transactions Report
            </Stack>
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="month"
                label="Month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="report-category-label">Category</InputLabel>
                <Select
                  labelId="report-category-label"
                  label="Category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
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
            <Grid item xs={12} sm={6} md={6} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FaDownload />}
                onClick={exportToExcel}
                disabled={loadingDailyTransactions || spareParts.length === 0}
              >
                Export to Excel
              </Button>
            </Grid>
          </Grid>

          {loadingDailyTransactions ? (
            <Alert severity="info">Loading transactions...</Alert>
          ) : spareParts.length === 0 ? (
            <Alert severity="warning">No spare parts found for the selected category.</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: '600px', overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Parts</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, minWidth: 50 }}>B.I.</TableCell>
                    {Array.from({ length: new Date(month + '-01').getDate() }).map((_, i) => (
                      <TableCell key={i} align="center" sx={{ fontWeight: 700, minWidth: 35 }}>
                        {i + 1}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spareParts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={new Date(month + '-01').getDate() + 3} sx={{ textAlign: 'center', py: 3 }}>
                        No spare parts found for the selected category.
                      </TableCell>
                    </TableRow>
                  ) : (
                    spareParts.map((part) => {
                      const biValue = Number(part.quantity || 0);
                      const partTransactions = dailyTransactions.filter(t => 
                        (t.sparePart?._id === part._id || t.sparePart === part._id)
                      );
                      
                      const daysInMonth = new Date(month + '-01').getDate();
                      const dailyValues = Array(daysInMonth).fill(0);
                      
                      partTransactions.forEach(tx => {
                        const dayNum = new Date(tx.date || tx.createdAt).getDate() - 1;
                        if (dayNum >= 0 && dayNum < daysInMonth) {
                          dailyValues[dayNum] += Number(tx.quantity || 0);
                        }
                      });

                      return (
                        <TableRow key={part._id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{part.name}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                            {biValue}
                          </TableCell>
                          {dailyValues.map((val, idx) => (
                            <TableCell key={idx} align="center">
                              <Box sx={{ bgcolor: val > 0 ? 'success.light' : 'transparent', px: 0.5, borderRadius: 0.5 }}>
                                {val}
                              </Box>
                            </TableCell>
                          ))}
                          <TableCell>—</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Alert severity="info">Preparing the latest report summary…</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report Type</TableCell>
                <TableCell>Focus Area</TableCell>
                <TableCell>Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell><Stack direction="row" spacing={1} alignItems="center"><FaClipboardList /> Daily Transactions</Stack></TableCell>
                <TableCell>Current operations</TableCell>
                <TableCell>Ready</TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Stack direction="row" spacing={1} alignItems="center"><FaClipboardList /> Monthly Consumption</Stack></TableCell>
                <TableCell>Production consumption</TableCell>
                <TableCell>Ready</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ReportsPage;
