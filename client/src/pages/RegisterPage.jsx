import { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Link as MuiLink,
  Stack,
  CircularProgress,
  MenuItem,
  Chip,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await register({ fullName, email, password, role });
      toast.success('Registration successful');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Card sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box component="img" src="/CPTECH-LOGO.png" alt="CPTECH logo" sx={{ height: 72, width: 72, mb: 2 }} />
                <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                  Create a CPTECH account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Provision access for inventory staff and administrators
                </Typography>
                <Chip label="Scalable operations" color="secondary" size="small" sx={{ mt: 1.5 }} />
              </Box>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                  <TextField
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    fullWidth
                    required
                    disabled={submitting}
                    autoFocus
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    disabled={submitting}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    disabled={submitting}
                    helperText="At least 6 characters"
                  />
                  <TextField
                    select
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    fullWidth
                    disabled={submitting}
                  >
                    <MenuItem value="staff">Staff</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </TextField>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {submitting ? 'Creating account...' : 'Create Account'}
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                Already have an account?{' '}
                  <MuiLink component={Link} to="/login" underline="hover">
                    Sign in
                  </MuiLink>
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default RegisterPage;
