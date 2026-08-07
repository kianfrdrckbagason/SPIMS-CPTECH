import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  Chip,
} from '@mui/material';
import {
  FaBars,
  FaSignOutAlt,
  FaHome,
  FaBoxes,
  FaTags,
  FaChartBar,
  FaUsers,
  FaTools,
  FaChevronDown,
  FaChevronUp,
  FaCogs,
} from 'react-icons/fa';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 260;

const MainLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [invOpen, setInvOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const getInitial = () => {
    if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <FaHome /> },
  ];

  const inventorySub = [
    { label: 'Spare Parts', path: '/spare-parts', icon: <FaBoxes /> },
    { label: 'Consumables', path: '/consumables', icon: <FaCogs /> },
    { label: 'Categories', path: '/categories', icon: <FaTags /> },
    { label: 'Tools Inventory', path: '/tools-inventory', icon: <FaTools /> },
  ];

  const others = [
    { label: 'Reports', path: '/reports', icon: <FaChartBar /> },
  ];

  if (user?.role === 'admin') {
    others.push({ label: 'Users', path: '/users', icon: <FaUsers /> });
  }

  const NavLinkItem = ({ item, depth = 0 }) => (
    <NavLink
      to={item.path}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      {({ isActive }) => (
        <Box
          sx={{
            bgcolor: isActive ? 'action.selected' : 'transparent',
            borderLeft: isActive ? 3 : 0,
            borderColor: 'primary.main',
            pl: depth * 1.5,
            '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
          }}
        >
          <ListItem sx={{ py: 1.1 }}>
            <ListItemIcon
              sx={{
                color: isActive ? 'primary.main' : 'text.secondary',
                minWidth: 40,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box sx={{ display: 'flex', fontSize: 16 }}>{item.icon}</Box>
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                '& .MuiTypography-root': {
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'inherit',
                  fontSize: depth > 0 ? '0.875rem' : '0.95rem',
                },
              }}
            />
          </ListItem>
        </Box>
      )}
    </NavLink>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) =>
            theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          ...(drawerOpen && {
            marginLeft: DRAWER_WIDTH,
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
            transition: (theme) =>
              theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <FaBars />
          </IconButton>
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              component="img"
              src="/CPTECH-LOGO.png"
              alt="CPTECH"
              sx={{ height: 34, width: 34, display: { xs: 'none', sm: 'block' } }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
              SPIMS • CPTECH
            </Typography>
            <Chip
              size="small"
              label="Spare Parts Inventory Management System"
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                bgcolor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 500,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 1 }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.85rem', lineHeight: 1.1 }}>
                {user?.fullName || user?.email}
              </Typography>
            </Box>
            <Tooltip title="Account menu">
              <IconButton onClick={handleAvatarClick} size="small" aria-haspopup="true">
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontWeight: 700 }}>
                  {getInitial()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                {user?.fullName || user?.email}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><FaSignOutAlt style={{ fontSize: 16 }} /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
            <Tooltip title="Logout">
              <IconButton color="inherit" onClick={handleLogout} aria-label="logout">
                <FaSignOutAlt />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            borderRight: '1px solid rgba(0,0,0,0.08)',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            ...(!drawerOpen && {
              width: 0,
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
            }),
          },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        <Box sx={{ overflow: 'auto', pb: 3 }}>
          <List>
            {navItems.map((item) => (
              <NavLinkItem key={item.path} item={item} />
            ))}
          </List>

          <Divider sx={{ my: 1 }} />

          <List>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemButton onClick={() => setInvOpen(!invOpen)} fullWidth>
                <ListItemIcon
                  sx={{ minWidth: 40, display: 'flex', alignItems: 'center', color: 'text.secondary' }}
                >
                  <Box sx={{ display: 'flex', fontSize: 16 }}><FaBoxes /></Box>
                </ListItemIcon>
                <ListItemText
                  primary="Inventory"
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: 1.1,
                      color: 'text.secondary',
                    },
                  }}
                />
                <IconButton edge="end" size="small">
                  {invOpen ? <FaChevronUp style={{ fontSize: 12 }} /> : <FaChevronDown style={{ fontSize: 12 }} />}
                </IconButton>
              </ListItemButton>
            </ListItem>
            <Collapse in={invOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {inventorySub.map((item) => (
                  <NavLinkItem key={item.path} item={item} depth={1} />
                ))}
              </List>
            </Collapse>
          </List>

          <Divider sx={{ my: 1 }} />

          <List>
            {others.map((item) => (
              <NavLinkItem key={item.path} item={item} />
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: (t) => t.palette.mode === 'light' ? '#f5f7fb' : 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 3, mb: 5 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

const ListItemButton = ({ children, onClick, fullWidth }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      width: fullWidth ? '100%' : undefined,
      borderRadius: 1,
      '&:hover': { bgcolor: 'action.hover' },
    }}
  >
    {children}
  </Box>
);

export default MainLayout;
