import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  Avatar,
  Skeleton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  FaBoxes,
  FaTags,
  FaExclamationTriangle,
  FaTimesCircle,
  FaArrowDown,
  FaArrowUp,
} from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import StatCard from '../components/dashboard/StatCard';
import { getStats, getRecentActivity, getAdminSummary } from '../services/dashboardApi';

dayjs.extend(relativeTime);

const typeToColor = (type) => {
  // fallback mapping for activity types
  const map = {
    transaction: 'primary',
    sparePart: 'secondary',
    user: 'warning',
  };
  return map[type] || 'info';
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getStats();
        if (mounted) setStats(s || {});
        try {
          const a = await getAdminSummary();
          if (mounted) setAdminStats(a || {});
        } catch (e) {
          // ignore admin summary errors
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    (async () => {
      try {
        const ra = await getRecentActivity(20);
        if (mounted) setRecentActivity(ra || []);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setActivityLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const renderStatCards = () => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
          <Skeleton variant="rectangular" height={120} />
        </Grid>
      ));
    }

    const cards = [
      {
        title: 'Total Spare Parts',
        value: stats?.totalSpareParts ?? 0,
        icon: <FaBoxes />,
        color: 'primary',
      },
      {
        title: 'Total Categories',
        value: stats?.totalCategories ?? 0,
        icon: <FaTags />,
        color: 'secondary',
      },
      {
        title: 'Low Stock Items',
        value: stats?.lowStockItems ?? 0,
        icon: <FaExclamationTriangle />,
        color: 'warning',
      },
      {
        title: 'Out of Stock Items',
        value: stats?.outOfStockItems ?? 0,
        icon: <FaTimesCircle />,
        color: 'error',
      },
      {
        title: 'Stock In Transactions',
        value: stats?.stockInTransactions ?? 0,
        icon: <FaArrowDown />,
        color: 'success',
      },
      {
        title: 'Stock Out Transactions',
        value: stats?.stockOutTransactions ?? 0,
        icon: <FaArrowUp />,
        color: 'info',
      },
    ];

    return cards.map((card, i) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
        <StatCard {...card} />
      </Grid>
    ));
  };

  const renderActivity = () => {
    if (activityLoading) {
      return (
        <Stack spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={72} />
          ))}
        </Stack>
      );
    }

    if (!recentActivity || recentActivity.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No recent activity
        </Typography>
      );
    }

    return (
      <List>
        {recentActivity.map((item, idx) => (
          <Box key={item.id || item._id || idx}>
            <ListItem sx={{ px: 0, py: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mr: 2 }}>
                {String((item.user || item.type || 'U').charAt(0)).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
                  {item.typeLabel || item.item || item.name || 'Activity'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {(() => {
                    const parts = [];
                    if (item.kind === 'transaction') {
                      if (item.user) parts.push(`by ${item.user}`);
                      if (typeof item.quantity !== 'undefined' && item.quantity !== null) parts.push(`Qty: ${item.quantity}`);
                      if (item.reference) parts.push(`Ref: ${item.reference}`);
                    } else if (item.kind === 'sparePart') {
                      if (item.sku) parts.push(`SKU: ${item.sku}`);
                      if (item.category) parts.push(`Category: ${item.category}`);
                      if (item.supplier) parts.push(`Supplier: ${item.supplier}`);
                    } else if (item.kind === 'user') {
                      if (item.userEmail) parts.push(item.userEmail);
                    }
                    return parts.join(' • ');
                  })()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', minWidth: 140 }}>
                <Tooltip title={item.createdAt ? dayjs(item.createdAt).format('MMMM D, YYYY h:mm A') : ''}>
                  <Typography variant="caption" color="text.secondary">
                    {item.createdAt ? dayjs(item.createdAt).fromNow() : ''}
                  </Typography>
                </Tooltip>
              </Box>
            </ListItem>
            {idx < recentActivity.length - 1 && <Divider sx={{ my: 1 }} />}
          </Box>
        ))}
      </List>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here is a real-time overview of your inventory system.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {renderStatCards()}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={12} lg={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ width: '100%' }}>
                {renderActivity()}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
