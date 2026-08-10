import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FaUserShield, FaKey } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authApi';

const UsersPage = () => {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleOpen = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.currentPassword) next.currentPassword = 'Current password is required';
    if (!form.newPassword) next.newPassword = 'New password is required';
    else if (form.newPassword.length < 6) next.newPassword = 'New password must be at least 6 characters';
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    return next;
  };

  const handleSubmit = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const result = await changePassword(form);
      toast.success(result?.message || 'Password changed successfully');
      handleClose();
    } catch (err) {
      const msg = err?.message || 'Failed to change password';
      if (msg.toLowerCase().includes('current password')) {
        setErrors({ currentPassword: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const username = user?.email || 'admin';
  const roleLabel = 'Administrator';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admin Account
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        SPIMS is configured with a single administrator account.
      </Typography>

      <Card variant="outlined" sx={{ maxWidth: 560 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <FaUserShield size={32} color="#1976d2" />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                System Administrator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Full system access and reporting
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Username (Email)
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {username}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Role
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip label={roleLabel} color="primary" size="small" />
            </Box>
          </Box>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<FaKey />}
            onClick={handleOpen}
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Change Admin Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your current password and choose a new one. The password is stored securely and used to sign in to the system.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              type="password"
              label="Current Password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword || ''}
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="New Password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword || ''}
            />
            <TextField
              fullWidth
              size="small"
              type="password"
              label="Confirm New Password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword || ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
