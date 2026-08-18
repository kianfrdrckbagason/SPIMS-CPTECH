import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import dayjs from 'dayjs';

const InventoryRecountCalendar = () => {
  const now = dayjs();
  const currentDate = now.date();
  const currentMonth = now.month();
  const currentYear = now.year();

  // Generate recount dates starting from the first day of the month, every 14 days
  const generateRecountDates = () => {
    const dates = [];
    let date = dayjs(`${currentYear}-${currentMonth + 1}-01`);
    
    while (date.month() === currentMonth) {
      dates.push(date.date());
      date = date.add(14, 'days');
    }
    
    return dates;
  };

  const recountDates = generateRecountDates();

  // Get the first day of month and number of days in month
  const firstDay = dayjs(`${currentYear}-${currentMonth + 1}-01`).day(); // 0=Sunday, 6=Saturday
  const daysInMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`).daysInMonth();

  // Generate calendar grid
  const calendarDays = [];
  // Add empty cells for days before the month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthName = now.format('MMMM YYYY');

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Inventory Recount Calendar
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {monthName}
        </Typography>

        <Box sx={{ mt: 2 }}>
          {/* Week day headers */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {weekDays.map((day) => (
              <Grid item xs={12 / 7} key={day} sx={{ textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar grid */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {calendarDays.map((day, idx) => {
              const isCurrentDate = day === currentDate;
              const isRecountDate = day && recountDates.includes(day);
              const isEmptyCell = day === null;

              return (
                <Grid item xs={12 / 7} key={idx} sx={{ textAlign: 'center', mb: 0.5 }}>
                  <Box
                    sx={{
                      aspectRatio: '1/1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      border: isCurrentDate ? '2px solid' : 'none',
                      borderColor: isCurrentDate ? 'primary.main' : 'transparent',
                      bgcolor: isRecountDate ? 'success.light' : isCurrentDate ? 'primary.light' : 'transparent',
                      cursor: isRecountDate ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': !isEmptyCell && !isRecountDate && !isCurrentDate ? {
                        bgcolor: 'action.hover',
                      } : {},
                    }}
                  >
                    {!isEmptyCell && (
                      <Typography
                        variant="caption"
                        fontWeight={isCurrentDate || isRecountDate ? 600 : 400}
                        color={isCurrentDate ? 'primary.main' : isRecountDate ? 'success.dark' : 'text.secondary'}
                      >
                        {day}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* Legend */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'primary.light', border: '2px solid primary.main' }} />
                  Current Date
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: 'success.light' }} />
                  Recount Scheduled
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Recount schedule info */}
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Recount Schedule:</strong> Every 14 days
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Dates: {recountDates.length > 0 ? recountDates.join(', ') : 'No dates this month'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InventoryRecountCalendar;
