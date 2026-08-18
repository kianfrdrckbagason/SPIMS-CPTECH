import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { FaPrint, FaFileInvoice, FaList } from 'react-icons/fa';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import * as reportApi from '../services/reportApi';
import * as categoryApi from '../services/categoryApi';

// ── Shared helpers ────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

const TYPE_COLOR = {
  'STOCK IN': 'success',
  'STOCK OUT': 'warning',
  'ADJUSTMENT': 'info',
  'BORROW': 'secondary',
  'RETURN': 'default',
  'RELEASE': 'warning',
};

const ITEM_TYPE_LABEL = {
  sparePart: 'Spare Part',
  consumable: 'Consumable',
  tool: 'Tool',
};

// ── Monthly Inventory Report tab ──────────────────────────────────────────────

const MonthlyInventoryReport = () => {
  const monthOptions = useMemo(buildMonthOptions, []);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    categoryApi.getAllCategories({ status: 'active' })
      .then((res) => { if (active) setCategories(res?.data || []); })
      .catch(() => {});
    return () => { active = false; };
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
    } catch {
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const selectedCatName = category
    ? categories.find((c) => c._id === category)?.name || ''
    : '';

  return (
    <Box>
      <div className="report-controls">
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
                <InputLabel id="inv-month-label">Month</InputLabel>
                <Select labelId="inv-month-label" label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 220 } }}>
                <InputLabel id="inv-category-label">Category</InputLabel>
                <Select labelId="inv-category-label" label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" color="primary" startIcon={<FaFileInvoice />} onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button variant="outlined" color="primary" startIcon={<FaPrint />} onClick={() => { if (!report) { toast.error('Please generate a report first'); return; } window.print(); }} disabled={!report}>
                Print / Export PDF
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </div>

      {loading && <Alert severity="info" sx={{ mb: 2 }}>Generating report...</Alert>}

      {report ? (
        <Box className="report-print-area">
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.paper' }}>
            <Box className="report-header" sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={1}>SPIMS-CPTECH</Typography>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>SPARE PARTS INVENTORY MONTHLY REPORT</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body1" fontWeight={600}>Month: {report.monthLabel}</Typography>
              {selectedCatName && <Typography variant="body1">Category: {selectedCatName}</Typography>}
            </Box>

            {report.categories.length === 0 ? (
              /* ── Empty state: no inventory records for this month (Task #48) ── */
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Inventory found for {report.monthLabel}.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  There are no inventory records for this period. Try selecting a different month.
                </Typography>
              </Box>
            ) : (
              report.categories.map((cat) => (
                <Box key={cat.category} className="category-group" sx={{ mb: 3 }}>
                  <Typography className="category-title" variant="subtitle1" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase' }}>
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
              ))
            )}

            <Box className="report-signatures" sx={{ mt: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Date Generated: {generatedDate}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={4} sx={{ mt: 6 }}>
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

// ── Monthly Transaction Report tab ────────────────────────────────────────────

const MonthlyTransactionReport = () => {
  const monthOptions = useMemo(buildMonthOptions, []);
  const [month, setMonth] = useState(monthOptions[0].value);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await reportApi.getMonthlyTransactionsReport(month);
      if (response?.success) {
        setReport(response.data);
      } else {
        toast.error(response?.message || 'Failed to generate report');
      }
    } catch {
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Box>
      <div className="report-controls">
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
                <InputLabel id="txn-month-label">Month</InputLabel>
                <Select labelId="txn-month-label" label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {monthOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" color="primary" startIcon={<FaList />} onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FaPrint />}
                onClick={() => { if (!report) { toast.error('Please generate a report first'); return; } window.print(); }}
                disabled={!report}
              >
                Print / Export PDF
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </div>

      {loading && <Alert severity="info" sx={{ mb: 2 }}>Generating report...</Alert>}

      {report ? (
        <Box className="report-print-area">
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, bgcolor: 'background.paper' }} className="report-transaction-paper">
            {/* Header */}
            <Box className="report-header" sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={800} letterSpacing={1}>SPIMS-CPTECH</Typography>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                MONTHLY TRANSACTION REPORT
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body1" fontWeight={600}>Month: {report.monthLabel}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total Transactions: {report.total}
              </Typography>
            </Box>

            {/* Transaction table */}
            {report.rows.length === 0 ? (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No transactions found for {report.monthLabel}.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" className="report-transaction-table">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Employee / Received By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Machine</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.rows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {dayjs(row.date).format('MMM DD, YYYY')}
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.item}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ITEM_TYPE_LABEL[row.itemType] || row.itemType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.type}
                            color={TYPE_COLOR[row.type] || 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{row.quantity}</TableCell>
                        <TableCell>{row.employeeName || '—'}</TableCell>
                        <TableCell>{row.department || '—'}</TableCell>
                        <TableCell>{row.machine || '—'}</TableCell>
                        <TableCell>{row.remarks || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Signatures */}
            <Box className="report-signatures" sx={{ mt: 6 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Date Generated: {generatedDate}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={4} sx={{ mt: 6 }}>
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
            Select a month and click <strong>Generate Report</strong> to preview the daily transaction log.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

// ── Root ReportsPage ──────────────────────────────────────────────────────────

const ReportsPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate printable monthly reports for inventory movements and stock levels.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        className="report-controls"
      >
        <Tab label="Monthly Inventory Report" />
        <Tab label="Monthly Transaction Report" />
      </Tabs>

      {tab === 0 && <MonthlyInventoryReport />}
      {tab === 1 && <MonthlyTransactionReport />}
    </Box>
  );
};

export default ReportsPage;
