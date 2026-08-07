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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
} from '@mui/material';
import { FaSearch, FaFileExcel, FaFilePdf, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { getStockMovements } from '../services/stockApi';
import { generateTransactionsReport, downloadFile } from '../services/reportApi';

const transactionTypeColors = {
  stockIn: 'success',
  stockOut: 'info',
  adjustment: 'secondary',
  borrowTool: 'warning',
  returnTool: 'success',
  consumableRelease: 'info',
  consumableStockIn: 'success',
  consumableAdjustment: 'secondary',
};

const transactionTypeLabels = {
  stockIn: 'Stock In',
  stockOut: 'Stock Out',
  adjustment: 'Adjustment',
  borrowTool: 'Borrow Tool',
  returnTool: 'Return Tool',
  consumableRelease: 'Consumable Release',
  consumableStockIn: 'Consumable Stock In',
  consumableAdjustment: 'Consumable Adjustment',
};

const itemTypeColors = {
  sparePart: 'primary',
  consumable: 'secondary',
  tool: 'info',
};

const allTransactionTypes = [
  'stockIn',
  'stockOut',
  'adjustment',
  'borrowTool',
  'returnTool',
  'consumableRelease',
  'consumableStockIn',
  'consumableAdjustment',
];

const allItemTypes = ['sparePart', 'consumable', 'tool'];

const TransactionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [serverPagination, setServerPagination] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [appliedTransactionType, setAppliedTransactionType] = useState('all');
  const [itemType, setItemType] = useState('all');
  const [appliedItemType, setAppliedItemType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        page: serverPagination ? page + 1 : undefined,
        limit: serverPagination ? rowsPerPage : undefined,
      };
      if (appliedStartDate) params.startDate = appliedStartDate;
      if (appliedEndDate) params.endDate = appliedEndDate;
      if (appliedTransactionType && appliedTransactionType !== 'all')
        params.type = appliedTransactionType;
      if (appliedItemType && appliedItemType !== 'all') params.itemType = appliedItemType;
      if (appliedSearch) params.search = appliedSearch;

      const response = await getStockMovements(params);

      if (Array.isArray(response)) {
        setTransactions(response);
        setServerPagination(null);
      } else if (response && Array.isArray(response.data)) {
        setTransactions(response.data);
        if (response.pagination && typeof response.pagination === 'object') {
          setServerPagination(response.pagination);
        } else {
          setServerPagination(null);
        }
      } else if (response && response.data && Array.isArray(response.data.data)) {
        setTransactions(response.data.data);
        if (response.data.pagination) {
          setServerPagination(response.data.pagination);
        } else {
          setServerPagination(null);
        }
      } else {
        setTransactions([]);
        setServerPagination(null);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load transactions');
      console.error(error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [appliedStartDate, appliedEndDate, appliedTransactionType, appliedItemType, appliedSearch]);

  useEffect(() => {
    if (serverPagination) fetchTransactions();
  }, [page, rowsPerPage]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedTransactionType(transactionType);
    setAppliedItemType(itemType);
    setAppliedSearch(searchInput.trim());
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setTransactionType('all');
    setItemType('all');
    setSearchInput('');
    setPage(0);
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAppliedTransactionType('all');
    setAppliedItemType('all');
    setAppliedSearch('');
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExport = async (format, period) => {
    try {
      const params = { format };
      if (period) params.period = period;
      if (appliedStartDate) params.startDate = appliedStartDate;
      if (appliedEndDate) params.endDate = appliedEndDate;
      if (appliedTransactionType && appliedTransactionType !== 'all')
        params.type = appliedTransactionType;
      if (appliedItemType && appliedItemType !== 'all') params.itemType = appliedItemType;
      if (appliedSearch) params.search = appliedSearch;
      const url = generateTransactionsReport(params);
      const ext = format === 'excel' ? 'xlsx' : format;
      const filename = `transactions-${dayjs().format('YYYYMMDD-HHmmss')}.${ext}`;
      await downloadFile(url, filename);
      toast.success('Report download started');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    }
  };

  const sortedTransactions = useMemo(() => {
    if (serverPagination) return transactions;
    return [...transactions].sort((a, b) => {
      const da = a.createdAt || a.transactionDate || a.date || 0;
      const db = b.createdAt || b.transactionDate || b.date || 0;
      return new Date(db) - new Date(da);
    });
  }, [transactions, serverPagination]);

  const paginatedTransactions = useMemo(() => {
    if (serverPagination) return sortedTransactions;
    const start = page * rowsPerPage;
    return sortedTransactions.slice(start, start + rowsPerPage);
  }, [sortedTransactions, page, rowsPerPage, serverPagination]);

  const totalCount = serverPagination
    ? serverPagination.total ?? serverPagination.totalItems ?? transactions.length
    : sortedTransactions.length;

  const renderTableSkeleton = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 10 }).map((__, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ));

  const formatDate = (val) => {
    if (!val) return '-';
    const d = dayjs(val);
    return d.isValid() ? d.format('MMM D, YYYY h:mm A') : '-';
  };

  const getItemName = (tx) => {
    if (tx.itemName) return tx.itemName;
    if (tx.sparePart?.name) return tx.sparePart.name;
    if (tx.consumable?.name) return tx.consumable.name;
    if (tx.tool?.name) return tx.tool.name;
    if (tx.item?.name) return tx.item.name;
    return '-';
  };

  const getItemSku = (tx) => {
    if (tx.sku) return tx.sku;
    if (tx.sparePart?.sku) return tx.sparePart.sku;
    if (tx.consumable?.sku) return tx.consumable.sku;
    if (tx.tool?.sku) return tx.tool.sku;
    if (tx.item?.sku) return tx.item.sku;
    return null;
  };

  const getItemType = (tx) => tx.itemType || tx.type === 'consumableRelease' || tx.type === 'consumableStockIn' || tx.type === 'consumableAdjustment'
    ? (tx.itemType || (tx.type?.startsWith('consumable') ? 'consumable' : tx.type === 'borrowTool' || tx.type === 'returnTool' ? 'tool' : 'sparePart'))
    : 'sparePart';

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Inventory Transaction History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete audit trail of every movement - never deleted
        </Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionType}
                  label="Transaction Type"
                  onChange={(e) => setTransactionType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {allTransactionTypes.map((t) => (
                    <MenuItem key={t} value={t}>
                      {transactionTypeLabels[t] || t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Item Type</InputLabel>
                <Select
                  value={itemType}
                  label="Item Type"
                  onChange={(e) => setItemType(e.target.value)}
                >
                  <MenuItem value="all">All Items</MenuItem>
                  {allItemTypes.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="SKU / item name"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyFilters();
                }}
                InputProps={{
                  startAdornment: <FaSearch style={{ marginRight: 8, color: 'text.secondary', fontSize: 12 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" onClick={handleApplyFilters} startIcon={<FaSearch />}>
                  Apply Filters
                </Button>
                <Button variant="outlined" onClick={handleReset} startIcon={<FaSync />}>
                  Reset
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Tooltip title="Export Excel">
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<FaFileExcel />}
                    onClick={() => handleExport('excel')}
                    size="medium"
                  >
                    Excel
                  </Button>
                </Tooltip>
                <Tooltip title="Export PDF">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<FaFilePdf />}
                    onClick={() => handleExport('pdf')}
                    size="medium"
                  >
                    PDF
                  </Button>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ boxShadow: 'none', maxHeight: '65vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Date &amp; Time</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Item Type</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Item Name / SKU</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }} align="right">Balance After</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Employee / Dept</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Machine</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Received / Released By</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                renderTableSkeleton()
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color="text.secondary">
                        No transactions found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try adjusting your filters or create a stock movement to see records here.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx, idx) => {
                  const txId = tx._id || tx.id || idx;
                  const txType = tx.type || 'adjustment';
                  const it = getItemType(tx);
                  const qty = typeof tx.quantity === 'number' ? tx.quantity : (tx.qty ?? '-');
                  const balanceAfter = typeof tx.balanceAfter === 'number' ? tx.balanceAfter : (tx.remainingQty ?? tx.newBalance ?? '-');
                  return (
                    <TableRow key={txId} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(tx.createdAt || tx.transactionDate || tx.date)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transactionTypeLabels[txType] || txType}
                          color={transactionTypeColors[txType] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={it.charAt(0).toUpperCase() + it.slice(1)}
                          color={itemTypeColors[it] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 220 }} title={getItemName(tx)}>
                            {getItemName(tx)}
                          </Typography>
                          {getItemSku(tx) && (
                            <Typography variant="caption" color="text.secondary">
                              SKU: {getItemSku(tx)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Typography fontWeight={600} color={txType.includes('stockIn') || txType === 'returnTool' ? 'success.main' : txType.includes('stockOut') || txType === 'consumableRelease' || txType === 'borrowTool' ? 'error.main' : 'inherit'}>
                          {typeof qty === 'number' ? (
                            <>
                              {(txType.includes('stockIn') || txType === 'returnTool' || txType === 'consumableStockIn') ? '+' : txType.includes('stockOut') || txType === 'consumableRelease' || txType === 'borrowTool' ? '-' : ''}
                              {qty}
                            </>
                          ) : qty}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {balanceAfter}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }} title={tx.employee || tx.department || tx.employeeName || tx.requestedBy || '-'}>
                          {tx.employee || tx.department || tx.employeeName || tx.requestedBy || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 120 }} title={tx.machine || '-'}>
                          {tx.machine || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }} title={tx.receivedBy || tx.releasedBy || tx.handledBy || '-'}>
                          {tx.receivedBy || tx.releasedBy || tx.handledBy || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }} title={tx.user?.fullName || tx.user?.email || tx.createdBy || tx.userName || '-'}>
                          {tx.user?.fullName || tx.user?.email || tx.createdBy || tx.userName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }} title={tx.remarks || tx.notes || tx.reason || ''}>
                          {tx.remarks || tx.notes || tx.reason || '-'}
                        </Typography>
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
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100, 250]}
        />
      </Card>
    </Box>
  );
};

export default TransactionsPage;
