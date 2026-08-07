import { Box, Card, CardContent, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { FaUserShield, FaUserCog } from 'react-icons/fa';

const users = [
  { name: 'Admin CPTECH', email: 'admin@cptech.com', role: 'Administrator' },
  { name: 'Rafael Cruz', email: 'rafael@cptech.com', role: 'Maintenance Lead' },
  { name: 'Nina Dela Cruz', email: 'nina@cptech.com', role: 'Inventory Staff' },
];

const UsersPage = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        User Access & Roles
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Administrators can manage access while maintenance teams work from shared dashboards.
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <FaUserShield size={24} color="#1976d2" />
                <Box>
                  <Typography variant="h6">Administrator access</Typography>
                  <Typography variant="body2" color="text.secondary">Full system visibility for SPIMS operations</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <FaUserCog size={24} color="#009688" />
                <Box>
                  <Typography variant="h6">Staff roles</Typography>
                  <Typography variant="body2" color="text.secondary">Inventory and maintenance staff use task-focused views</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {users.map((user) => (
            <Grid item xs={12} md={4} key={user.email}>
              <Card variant="outlined">
                <CardContent>
                  <Typography fontWeight={700}>{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  <Chip label={user.role} color="primary" size="small" sx={{ mt: 1.5 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default UsersPage;
