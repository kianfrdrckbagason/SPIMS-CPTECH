import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import { FaCalendarDay, FaBoxes, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';

const sampleEntries = [
  { _id: 'cons-1', date: '2026-07-31', productionLine: 'Line 1', shift: 'Day', item: 'Gloves (Long)', quantity: 24, issuedBy: 'Maria Santos', remarks: 'High usage for printing run' },
  { _id: 'cons-2', date: '2026-07-31', productionLine: 'Line 2', shift: 'Night', item: 'Powder', quantity: 16, issuedBy: 'Julius Ramos', remarks: 'Ink powder refill' },
];

const DailyConsumptionPage = () => {
  const [entries, setEntries] = useState(sampleEntries);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    productionLine: 'Line 1',
    shift: 'Day',
    item: 'Gloves (Long)',
    quantity: '',
    issuedBy: '',
    remarks: '',
  });

  const totals = useMemo(() => entries.reduce((acc, entry) => {
    acc.quantity += Number(entry.quantity || 0);
    return acc;
  }, { quantity: 0 }), [entries]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.quantity || !form.issuedBy) {
      toast.error('Please complete the quantity and issued-by fields.');
      return;
    }
    if (Number(form.quantity) <= 0) {
      toast.error('Quantity must be at least 1.');
      return;
    }

    setEntries((current) => [
      {
        _id: `cons-${Date.now()}`,
        ...form,
        quantity: Number(form.quantity),
      },
      ...current,
    ]);
    toast.success('Daily consumption entry recorded.');
    setForm((current) => ({ ...current, quantity: '', issuedBy: '', remarks: '' }));
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Daily Production Consumption
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Capture consumables issued per production line and shift.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FaPrint />}>
          Export summary
        </Button>
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FaCalendarDay size={22} color="#1976d2" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Entries recorded</Typography>
                  <Typography variant="h5" fontWeight={700}>{entries.length}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FaBoxes size={22} color="#009688" />
                <Box>
                  <Typography variant="body2" color="text.secondary">Total quantity used</Typography>
                  <Typography variant="h5" fontWeight={700}>{totals.quantity}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>New consumption entry</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField label="Date" type="date" fullWidth value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="Production Line" fullWidth value={form.productionLine} onChange={(e) => setForm({ ...form, productionLine: e.target.value })} required />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField select label="Shift" fullWidth value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} required>
                <MenuItem value="Day">Day</MenuItem>
                <MenuItem value="Night">Night</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Item" fullWidth value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} required />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                label="Quantity"
                type="number"
                fullWidth
                value={form.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || Number(val) >= 0) {
                    setForm({ ...form, quantity: val });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-') e.preventDefault();
                }}
                InputProps={{ inputProps: { min: 1, step: 1 } }}
                error={!!form.quantity && Number(form.quantity) <= 0}
                helperText={!!form.quantity && Number(form.quantity) <= 0 ? 'Quantity must be at least 1' : ''}
                required
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="Issued By" fullWidth value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} required />
            </Grid>
            <Grid item xs={12} md={7}>
              <TextField label="Remarks" fullWidth value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button type="submit" variant="contained" fullWidth>
                Save entry
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Line</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Issued By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry._id} hover>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.productionLine}</TableCell>
                <TableCell>{entry.shift}</TableCell>
                <TableCell>{entry.item}</TableCell>
                <TableCell>{entry.quantity}</TableCell>
                <TableCell>{entry.issuedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DailyConsumptionPage;
