import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FaPrint, FaFileInvoice } from 'react-icons/fa';
import { toast } from 'react-toastify';
import * as reportApi from '../services/reportApi';
import * as categoryApi from '../services/categoryApi';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Build a list of the last 24 months (e.g. "August 2026") for the dropdown
const buildMonthOptions = () => {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
};

const ReportsPage = () => {
  const monthOptions = useMemo(buildMonthOptions, []);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAllCategories({ status: 'active' });
        if (active) setCategories(res?.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await reportApi.getMonthlyInventoryReport(month, category);
      if (response?.success) {
        setReport(response.data);
      } else {
        toast.error(response?.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Failed to generate monthly report:', err);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) {
      toast.error('Please generate a report first');
      return;
    }
    window.print();
  };

  const generatedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const selectedCatName = category
    ? categories.find((c) => c._id === category)?.name || ''
    : '';

  return (
    <Box>
      {/* Control panel (hidden when printing) */}
      <div className="report-controls">
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Monthly Inventory Report
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Generate a professional, printable monthly inventory report for your supervisor.
            </Typography>
          </Box>
        </Stack>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
                <InputLabel id="report-month-label">Month</InputLabel>
                <Select
                  labelId="report-month-label"
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {monthOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
                <InputLabel id="report-category-label">Category</InputLabel>
                <Select
                  labelId="report-category-label"
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                size="medium"
                startIcon={<FaFileInvoice />}
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="medium"
                startIcon={<FaPrint />}
                onClick={handlePrint}
                disabled={!report}
              >
                Print / Export PDF
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </div>

      {/* Printable report area */}
      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>Generating report...</Alert>
      )}

      {report ? (
        <Box className="report-print-area">
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.paper' }}>
{/* Header */}
            <Box className="report-header" sx={{ textAlign: 'center', mb: 3, position: 'relative' }}>
              <span className="report-page-indicator" aria-hidden="true" />
              <Typography variant="h5" fontWeight={800} letterSpacing={1}>
                SPIMS-CPTECH
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                SPARE PARTS INVENTORY MONTHLY REPORT
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body1" fontWeight={600}>
                Month: {report.monthLabel}
              </Typography>
              {selectedCatName && (
                <Typography variant="body1">
                  Category: {selectedCatName}
                </Typography>
              )}
            </Box>

            {/* Inventory summary */}
            {report.categories.map((cat) => (
              <Box key={cat.category} className="category-group" sx={{ mb: 3 }}>
                <Typography
                  className="category-title"
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ mb: 1, textTransform: 'uppercase' }}
                >
                  {cat.category}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Part</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Unit</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Beginning</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Stock In</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Stock Out</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Ending</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cat.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{cat.category}</TableCell>
                          <TableCell>{item.part}</TableCell>
                          <TableCell align="center">{item.unit}</TableCell>
                          <TableCell align="center">{item.beginning}</TableCell>
                          <TableCell align="center">{item.stockIn}</TableCell>
                          <TableCell align="center">{item.stockOut}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{item.ending}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}

            {/* Signatures */}
            <Box className="report-signatures" sx={{ mt: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Date Generated: {generatedDate}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={4}
                sx={{ mt: 6 }}
              >
                {['Prepared by', 'Reviewed by', 'Approved by'].map((label) => (
                  <Box key={label} sx={{ textAlign: 'center', flex: 1 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, minWidth: 160 }} />
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">Name / Signature / Date</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography variant="body1" color="text.secondary">
            Select a month and click <strong>Generate Report</strong> to preview the monthly inventory report.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ReportsPage;
