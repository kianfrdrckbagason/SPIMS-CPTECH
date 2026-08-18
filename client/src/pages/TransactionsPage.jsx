import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ToggleButtonGroup,
  ToggleButton,
  Divider,
} from '@mui/material';
import {
  FaFileExcel,
  FaFilePdf,
  FaSearch,
  FaTable,
  FaCalendarAlt,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { getStockMovements } from '../services/stockApi';
import { getMonthlySheet } from '../services/transactionApi';
import { getAllCategories } from '../services/categoryApi';
import { generateTransactionsReport, downloadFile } from '../services/reportApi';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
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

const itemTypeColors  = { sparePart: 'primary', consumable: 'secondary', tool: 'info' };
const allTransactionTypes = Object.keys(transactionTypeLabels);
const allItemTypes    = ['sparePart', 'consumable', 'tool'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ---------------------------------------------------------------------------
// Monthly-sheet cell styles
// ---------------------------------------------------------------------------
const sheetCellSx = {
  px: 0.75, py: 0.5, fontSize: '0.72rem', whiteSpace: 'nowrap',
  borderRight: '1px solid rgba(224,224,224,1)',
};
const sheetHeaderSx = {
  ...sheetCellSx, fontWeight: 700, bgcolor: '#1565c0', color: '#fff',
  position: 'sticky', top: 0, zIndex: 3,
};
const rowLabelSx = {
  ...sheetCellSx, fontWeight: 600, bgcolor: '#f5f5f5',
  position: 'sticky', left: 0, zIndex: 2,
};
const SUB_ROWS = [
  { key: 'received',        label: 'Received (Daily)', color: '#e8f5e9', textColor: '#1b5e20' },
  { key: 'runningReceived', label: 'Running',           color: '#f1f8e9', textColor: '#33691e' },
  { key: 'withdraw',        label: 'Withdraw (Daily)',  color: '#fff3e0', textColor: '#e65100' },
  { key: 'runningWithdraw', label: 'Running',           color: '#fbe9e7', textColor: '#bf360c' },
  { key: 'balance',         label: 'Balance Daily',     color: '#e3f2fd', textColor: '#0d47a1' },
];

// ---------------------------------------------------------------------------
// Filter bar shared styles — every control uses the same 40 px height
// ---------------------------------------------------------------------------
const labelSx = {
  fontWeight: 600, color: 'text.secondary', display: 'block',
  mb: 0.5, ml: 0.25, fontSize: '0.72rem', lineHeight: 1.4, whiteSpace: 'nowrap',
};
const dateSx = {
  '& .MuiInputBase-root': { height: 40, boxSizing: 'border-box' },
  '& .MuiInputBase-input': {
    height: '100%', boxSizing: 'border-box',
    paddingTop: 0, paddingBottom: 0,
    fontFamily: 'inherit', fontSize: '0.875rem',
  },
};
const selectSx = {
  height: 40, fontSize: '0.875rem',
  '& .MuiSelect-select': { paddingTop: '8.5px', paddingBottom: '8.5px' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = dayjs();

  // ── view toggle ────────────────────────────────────────────────────────────
  const [view, setView] = useState('history'); // 'history' | 'monthly'

  // ── history: single-tier filter state (no staged/applied split) ────────────
  const [loading, setLoading]               = useState(false);
  const [transactions, setTransactions]     = useState([]);
  const [serverPagination, setServerPagination] = useState(null);
  const [page, setPage]                     = useState(0);
  const [rowsPerPage, setRowsPerPage]       = useState(50);

  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [itemType, setItemType]             = useState('all');

  // ── monthly sheet state ────────────────────────────────────────────────────
  const [sheetLoading, setSheetLoading]     = useState(false);
  const [sheetData, setSheetData]           = useState(null);
  const [sheetMonth, setSheetMonth]         = useState(now.month() + 1);
  const [sheetYear, setSheetYear]           = useState(now.year());
  const [sheetItemType, setSheetItemType]   = useState('sparePart');
  const [sheetCategory, setSheetCategory]   = useState('all');
  const [categories, setCategories]         = useState([]);

  // ── read ?type= URL param on mount ────────────────────────────────────────
  const didSeedFromUrl = useRef(false);
  useEffect(() => {
    if (didSeedFromUrl.current) return;
    didSeedFromUrl.current = true;
    const typeParam = searchParams.get('type');
    if (typeParam && allTransactionTypes.includes(typeParam)) {
      setTransactionType(typeParam);
      setView('history');
    }
    // clear the param so it doesn't interfere with future navigation
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── categories for monthly sheet ──────────────────────────────────────────
  useEffect(() => {
    getAllCategories({ status: 'active', limit: 200 })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setCategories(list);
      })
      .catch(() => {});
  }, []);

  // ── fetch history — fires automatically whenever any filter changes ────────
  useEffect(() => {
    if (view !== 'history') return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = { sort: '-createdAt,-date' };
        if (startDate)                            params.startDate = startDate;
        if (endDate)                              params.endDate   = endDate;
        if (transactionType && transactionType !== 'all') params.type = transactionType;
        if (itemType && itemType !== 'all')       params.itemType  = itemType;

        const response = await getStockMovements(params);
        if (cancelled) return;

        if (Array.isArray(response)) {
          setTransactions(response);
          setServerPagination(null);
        } else if (response?.data && Array.isArray(response.data)) {
          setTransactions(response.data);
          setServerPagination(response.pagination ?? null);
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          setTransactions(response.data.data);
          setServerPagination(response.data.pagination ?? null);
        } else {
          setTransactions([]);
          setServerPagination(null);
        }
        setPage(0); // reset to page 1 whenever filters change
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load transactions');
          setTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  // Re-run on every filter value change or view switch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, transactionType, itemType, view]);

  // ── pagination change re-fetch (server-side paging only) ──────────────────
  useEffect(() => {
    if (view === 'history' && serverPagination) {
      // trigger a fresh fetch for the new page
      setLoading(true);
      const params = {
        sort: '-createdAt,-date',
        page: page + 1,
        limit: rowsPerPage,
      };
      if (startDate)                            params.startDate = startDate;
      if (endDate)                              params.endDate   = endDate;
      if (transactionType && transactionType !== 'all') params.type = transactionType;
      if (itemType && itemType !== 'all')       params.itemType  = itemType;

      getStockMovements(params)
        .then((response) => {
          if (response?.data && Array.isArray(response.data)) {
            setTransactions(response.data);
            setServerPagination(response.pagination ?? null);
          } else if (response?.data?.data && Array.isArray(response.data.data)) {
            setTransactions(response.data.data);
            setServerPagination(response.data.pagination ?? null);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // ── fetch monthly sheet ────────────────────────────────────────────────────
  const fetchMonthlySheet = async () => {
    setSheetLoading(true);
    setSheetData(null);
    try {
      const params = { month: sheetMonth, year: sheetYear, itemType: sheetItemType };
      if (sheetCategory && sheetCategory !== 'all') params.category = sheetCategory;
      const res = await getMonthlySheet(params);
      if (res?.success) setSheetData(res.data);
      else toast.error('Failed to load monthly sheet');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load monthly sheet');
    } finally {
      setSheetLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'monthly') fetchMonthlySheet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ── export — always uses the live (currently active) filter state ──────────
  const handleExport = async (format) => {
    try {
      const params = { format };
      if (startDate)                            params.startDate = startDate;
      if (endDate)                              params.endDate   = endDate;
      if (transactionType && transactionType !== 'all') params.type = transactionType;
      if (itemType && itemType !== 'all')       params.itemType  = itemType;
      const url = generateTransactionsReport(params);
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await downloadFile(url, `transactions-${dayjs().format('YYYYMMDD-HHmmss')}.${ext}`);
      toast.success('Download started');
    } catch {
      toast.error('Export failed. Please try again.');
    }
  };

  // ── sorted / paginated (client-side fallback) ─────────────────────────────
  const sortedTransactions = useMemo(() => {
    if (serverPagination) return transactions;
    return [...transactions].sort((a, b) => {
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (cb !== ca) return cb - ca;
      return new Date(b.date || b.transactionDate || 0) - new Date(a.date || a.transactionDate || 0);
    });
  }, [transactions, serverPagination]);

  const paginatedTransactions = useMemo(() => {
    if (serverPagination) return sortedTransactions;
    return sortedTransactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedTransactions, page, rowsPerPage, serverPagination]);

  const totalCount = serverPagination
    ? (serverPagination.total ?? serverPagination.totalItems ?? transactions.length)
    : sortedTransactions.length;

  // ── helpers ───────────────────────────────────────────────────────────────
  const formatDate  = (val) => { const d = dayjs(val); return d.isValid() ? d.format('MMM D, YYYY h:mm A') : '-'; };
  const getItemName = (tx)  => tx.itemName || tx.sparePart?.name || tx.consumable?.name || tx.tool?.name || tx.item?.name || '-';
  const getItemSku  = (tx)  => tx.sku || tx.sparePart?.sku || tx.consumable?.sku || tx.tool?.sku || tx.item?.sku || null;
  const resolveItemType = (tx) => {
    if (tx.itemType) return tx.itemType;
    if (tx.type?.startsWith('consumable')) return 'consumable';
    if (tx.type === 'borrowTool' || tx.type === 'returnTool') return 'tool';
    return 'sparePart';
  };
  const isInflow  = (t) => ['stockIn','consumableStockIn','returnTool'].includes(t);
  const isOutflow = (t) => ['stockOut','consumableRelease','borrowTool'].includes(t);

  // ── skeleton ──────────────────────────────────────────────────────────────
  const renderTableSkeleton = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: 11 }).map((__, j) => (
          <TableCell key={j}><Skeleton variant="text" /></TableCell>
        ))}
      </TableRow>
    ));

  // ---------------------------------------------------------------------------
  // Render — history view
  // ---------------------------------------------------------------------------
  const renderHistory = () => (
    <>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          {/* Row 1 — filter controls (auto-update on change, no button needed) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: '1fr 1fr 1.4fr 1.2fr' },
              gap: 2,
              alignItems: 'end',
            }}
          >
            {/* Start Date */}
            <Box>
              <Typography variant="caption" sx={labelSx}>Start Date</Typography>
              <TextField
                fullWidth size="small" type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={dateSx}
              />
            </Box>

            {/* End Date */}
            <Box>
              <Typography variant="caption" sx={labelSx}>End Date</Typography>
              <TextField
                fullWidth size="small" type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={dateSx}
              />
            </Box>

            {/* Transaction Type */}
            <Box>
              <Typography variant="caption" sx={labelSx}>Transaction Type</Typography>
              <Select
                fullWidth size="small" displayEmpty
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="all">All Types</MenuItem>
                {allTransactionTypes.map((t) => (
                  <MenuItem key={t} value={t}>{transactionTypeLabels[t]}</MenuItem>
                ))}
              </Select>
            </Box>

            {/* Item Type */}
            <Box>
              <Typography variant="caption" sx={labelSx}>Item Type</Typography>
              <Select
                fullWidth size="small" displayEmpty
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                sx={selectSx}
              >
                <MenuItem value="all">All Items</MenuItem>
                {allItemTypes.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t === 'sparePart' ? 'Spare Part' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Row 2 — export buttons only */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: 1,
              mt: 2,
            }}
          >
            <Tooltip title="Export filtered results to Excel">
              <Button
                variant="outlined" color="success" size="small"
                startIcon={<FaFileExcel />}
                onClick={() => handleExport('excel')}
              >
                Export Excel
              </Button>
            </Tooltip>
            <Tooltip title="Export filtered results to PDF">
              <Button
                variant="outlined" color="error" size="small"
                startIcon={<FaFilePdf />}
                onClick={() => handleExport('pdf')}
              >
                Export PDF
              </Button>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Card>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ boxShadow: 'none', maxHeight: '62vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  'Date & Time','Type','Item Type','Item Name / SKU',
                  'Qty','Balance After','Employee / Dept',
                  'Machine','Received / Released By','User','Remarks',
                ].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'grey.100' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? renderTableSkeleton() : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 10 }}>
                    <Typography variant="h6" color="text.secondary">No transactions found</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Try adjusting the filters above
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.map((tx, idx) => {
                const itype    = resolveItemType(tx);
                const qty      = tx.quantity ?? 0;
                const qtyColor = isInflow(tx.type) ? 'success.main' : isOutflow(tx.type) ? 'error.main' : 'text.primary';
                const name     = getItemName(tx);
                const sku      = getItemSku(tx);
                return (
                  <TableRow key={tx._id || tx.id || idx} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {formatDate(tx.createdAt || tx.transactionDate || tx.date)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transactionTypeLabels[tx.type] || tx.type}
                        color={transactionTypeColors[tx.type] || 'default'}
                        size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={itype === 'sparePart' ? 'Spare Part' : itype.charAt(0).toUpperCase() + itype.slice(1)}
                        color={itemTypeColors[itype] || 'default'}
                        size="small" variant="outlined" sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{name}</Typography>
                      {sku && <Typography variant="caption" color="text.secondary">{sku}</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: qtyColor }}>
                        {isInflow(tx.type) ? '+' : isOutflow(tx.type) ? '-' : ''}{qty}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                      {tx.balanceAfter ?? tx.remainingQty ?? tx.newBalance ?? '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {[tx.employeeName || tx.employee, tx.department].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{tx.machine || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {tx.receivedBy || tx.releasedBy || tx.handledBy || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      {tx.user?.fullName || tx.user?.email || tx.createdBy || tx.userName || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 160 }}>
                      <Tooltip title={tx.remarks || tx.notes || tx.reason || ''}>
                        <Typography variant="body2" noWrap>
                          {tx.remarks || tx.notes || tx.reason || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100, 250]}
        />
      </Card>
    </>
  );

  // ---------------------------------------------------------------------------
  // Render — monthly sheet view
  // ---------------------------------------------------------------------------
  const renderMonthlySheet = () => {
    const yearOptions = [];
    for (let y = now.year() - 3; y <= now.year() + 1; y++) yearOptions.push(y);

    const daysInMonth = sheetData?.daysInMonth ?? 0;
    const rows        = sheetData?.rows ?? [];
    const monthLabel  = `${MONTH_NAMES[(sheetData?.month ?? sheetMonth) - 1]} ${sheetData?.year ?? sheetYear}`;

    return (
      <>
        {/* Sheet controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select value={sheetMonth} label="Month" onChange={(e) => setSheetMonth(e.target.value)}>
                    {MONTH_NAMES.map((m, i) => (
                      <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select value={sheetYear} label="Year" onChange={(e) => setSheetYear(e.target.value)}>
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Item Type</InputLabel>
                  <Select value={sheetItemType} label="Item Type" onChange={(e) => setSheetItemType(e.target.value)}>
                    <MenuItem value="sparePart">Spare Parts</MenuItem>
                    <MenuItem value="consumable">Consumables</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select value={sheetCategory} label="Category" onChange={(e) => setSheetCategory(e.target.value)}>
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained" startIcon={<FaSearch />}
                  disabled={sheetLoading} fullWidth
                  onClick={fetchMonthlySheet}
                >
                  {sheetLoading ? 'Loading…' : 'Generate Sheet'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Legend */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {SUB_ROWS.map((sr) => (
            <Chip key={sr.key} label={sr.label} size="small"
              sx={{ bgcolor: sr.color, color: sr.textColor, fontWeight: 600, fontSize: '0.7rem' }} />
          ))}
        </Stack>

        {/* Sheet table */}
        <Card>
          {sheetLoading && <LinearProgress />}

          {!sheetLoading && !sheetData && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select a month and click "Generate Sheet"
              </Typography>
            </Box>
          )}

          {!sheetLoading && sheetData && rows.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">No inventory movements found for {monthLabel}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No transactions exist for this period.
              </Typography>
            </Box>
          )}

          {!sheetLoading && sheetData && rows.length > 0 && (
            <>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                <Typography variant="h6" fontWeight={700}>MONTH OF {monthLabel.toUpperCase()}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {sheetItemType === 'sparePart' ? 'Spare Parts' : 'Consumables'} •{' '}
                  {rows.length} item{rows.length !== 1 ? 's' : ''} with activity
                </Typography>
              </Box>
              <Divider />

              <TableContainer sx={{ overflowX: 'auto', maxHeight: '68vh' }}>
                <Table size="small" stickyHeader sx={{ tableLayout: 'auto', minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...sheetHeaderSx, minWidth: 36, position: 'sticky', left: 0, zIndex: 4 }} align="center">No</TableCell>
                      <TableCell sx={{ ...sheetHeaderSx, minWidth: 180, position: 'sticky', left: 36, zIndex: 4 }}>Parts</TableCell>
                      <TableCell sx={{ ...sheetHeaderSx, minWidth: 70, position: 'sticky', left: 216, zIndex: 4 }} align="center">B.I.</TableCell>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <TableCell key={d} align="center"
                          sx={{
                            ...sheetHeaderSx, minWidth: 36,
                            bgcolor: d === now.date() && sheetMonth === now.month() + 1 && sheetYear === now.year()
                              ? '#0d47a1' : '#1565c0',
                          }}
                        >{d}</TableCell>
                      ))}
                      <TableCell sx={{ ...sheetHeaderSx, minWidth: 120 }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, rowIdx) => (
                      <>
                        {/* Part name header row */}
                        <TableRow key={`${row.partId}-name`}>
                          <TableCell align="center" rowSpan={SUB_ROWS.length + 1}
                            sx={{ ...sheetCellSx, fontWeight: 700, bgcolor: '#f0f4ff', position: 'sticky', left: 0, zIndex: 2, borderRight: '1px solid #c5cae9', verticalAlign: 'middle' }}>
                            {rowIdx + 1}
                          </TableCell>
                          <TableCell colSpan={2 + daysInMonth + 1}
                            sx={{ ...sheetCellSx, fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.78rem', position: 'sticky', left: 36, zIndex: 2 }}>
                            {row.partName}
                            {row.sku && <Typography component="span" sx={{ ml: 1, fontWeight: 400, fontSize: '0.68rem', color: '#555' }}>[{row.sku}]</Typography>}
                            {row.categoryName && <Typography component="span" sx={{ ml: 1, fontWeight: 400, fontSize: '0.68rem', color: '#777' }}>— {row.categoryName}</Typography>}
                          </TableCell>
                        </TableRow>

                        {/* Sub-rows */}
                        {SUB_ROWS.map((sr, srIdx) => (
                          <TableRow key={`${row.partId}-${sr.key}`}>
                            <TableCell sx={{ ...rowLabelSx, left: 36, minWidth: 140, bgcolor: sr.color, color: sr.textColor, borderRight: '2px solid #ccc' }}>
                              {sr.label}
                            </TableCell>
                            {srIdx === 0 ? (
                              <TableCell align="center" rowSpan={SUB_ROWS.length}
                                sx={{ ...sheetCellSx, position: 'sticky', left: 216, zIndex: 2, fontWeight: 700, bgcolor: '#fff8e1', color: '#e65100', fontSize: '0.78rem', verticalAlign: 'middle', borderRight: '2px solid #e0e0e0' }}>
                                {row.beginningInventory}
                              </TableCell>
                            ) : null}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                              const dayData = row.days[d];
                              const val     = dayData?.[sr.key] ?? 0;
                              const display = val !== 0 || sr.key === 'balance' ? val : '';
                              let cellBg = sr.color;
                              if (sr.key === 'received' && val > 0) cellBg = '#a5d6a7';
                              if (sr.key === 'withdraw' && val > 0) cellBg = '#ffcc80';
                              return (
                                <TableCell key={d} align="center"
                                  sx={{ ...sheetCellSx, bgcolor: cellBg, color: val !== 0 ? sr.textColor : 'text.disabled', fontWeight: (sr.key === 'balance' || (val > 0 && (sr.key === 'received' || sr.key === 'withdraw'))) ? 700 : 400, minWidth: 36 }}>
                                  {display}
                                </TableCell>
                              );
                            })}
                            {sr.key === 'balance'
                              ? <TableCell sx={{ ...sheetCellSx, bgcolor: sr.color, fontSize: '0.7rem' }}>{row.remarks || ''}</TableCell>
                              : <TableCell sx={{ ...sheetCellSx, bgcolor: sr.color }} />}
                          </TableRow>
                        ))}

                        {rowIdx < rows.length - 1 && (
                          <TableRow key={`${row.partId}-spacer`}>
                            <TableCell colSpan={3 + daysInMonth + 1} sx={{ p: 0, bgcolor: '#e8eaf6', height: 4 }} />
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Card>
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <Box>
      {/* Page header + view toggle */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>Transactions</Typography>
          <Typography variant="body1" color="text.secondary">
            {view === 'history'
              ? 'Filters update the table automatically as you change them.'
              : 'Monthly Excel-style inventory sheet — Beginning Inventory → Daily Received/Withdrawn → Balance'}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={view} exclusive size="small"
          onChange={(_, v) => { if (v) setView(v); }}
          sx={{ alignSelf: 'center' }}
        >
          <ToggleButton value="history" sx={{ px: 2 }}>
            <FaTable style={{ marginRight: 6 }} />Transaction History
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ px: 2 }}>
            <FaCalendarAlt style={{ marginRight: 6 }} />Monthly Sheet
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'history' ? renderHistory() : renderMonthlySheet()}
    </Box>
  );
};

export default TransactionsPage;
