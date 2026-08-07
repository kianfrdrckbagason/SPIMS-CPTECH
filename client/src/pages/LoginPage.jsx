import { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  CircularProgress,
  Chip,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password });
      toast.success('Login successful');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
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
        }}
      >
        <Card sx={{ width: '100%', borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Box component="img" src="/CPTECH-LOGO.png" alt="CPTECH logo" sx={{ height: 72, width: 72, mb: 2 }} />
                <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                  CPTECH SPIMS
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Secure access to the spare parts inventory platform
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    disabled={submitting}
                    autoFocus
                  />
                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    disabled={submitting}
                    autoComplete="current-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment
                          position="end"
                          sx={{
                            marginRight: 0.25,
                            alignItems: 'center',
                            '& .MuiIconButton-root': {
                              color: 'text.secondary',
                              transition: 'color 0.2s ease, background-color 0.2s ease',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: 'action.hover',
                              },
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: 2,
                              },
                            },
                          }}
                        >
                          <IconButton
                            type="button"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            aria-pressed={showPassword}
                            onClick={() => setShowPassword((prev) => !prev)}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                            disabled={submitting}
                            sx={{ p: 1 }}
                          >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {submitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </Stack>
              </Box>

            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;
