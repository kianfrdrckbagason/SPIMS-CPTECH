import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Avatar,
  Skeleton,
  Tooltip,
  Stack,
  List,
  ListItem,
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
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import StatCard from '../components/dashboard/StatCard';
import {
  getStats,
  getRecentActivity,
  getAdminSummary,
} from '../services/dashboardApi';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// Philippine Standard Time — UTC+8
const PH_TZ = 'Asia/Manila';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Fetch summary stats
    (async () => {
      try {
        const s = await getStats();
        if (mounted) setStats(s || {});
        try {
          await getAdminSummary();
        } catch {
          // admin summary is optional
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Fetch recent activity
    (async () => {
      try {
        const ra = await getRecentActivity(20);
        if (mounted) setRecentActivity(ra || []);
      } catch {
        // ignore
      } finally {
        if (mounted) setActivityLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleCardClick = (card) => {
    switch (card.type) {
      case 'totalSpareParts':
        navigate('/spare-parts');
        break;
      case 'totalCategories':
        navigate('/categories');
        break;
      case 'lowStock':
        navigate('/spare-parts?stockStatus=low');
        break;
      case 'outOfStock':
        navigate('/spare-parts?stockStatus=out');
        break;
      // Stock In / Stock Out → Transactions module with type pre-filtered + current month
      case 'stockIn':
        navigate('/transactions?type=stockIn');
        break;
      case 'stockOut':
        navigate('/transactions?type=stockOut');
        break;
      default:
        break;
    }
  };

  const renderStatCards = () => {
    if (loading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
        </Grid>
      ));
    }

    const cards = [
      {
        title: 'Total Spare Parts',
        value: stats?.totalSpareParts ?? 0,
        icon: <FaBoxes />,
        color: 'primary',
        type: 'totalSpareParts',
      },
      {
        title: 'Total Categories',
        value: stats?.totalCategories ?? 0,
        icon: <FaTags />,
        color: 'secondary',
        type: 'totalCategories',
      },
      {
        title: 'Low Stock Items',
        value: stats?.lowStockItems ?? 0,
        icon: <FaExclamationTriangle />,
        color: 'warning',
        type: 'lowStock',
      },
      {
        title: 'Out of Stock Items',
        value: stats?.outOfStockItems ?? 0,
        icon: <FaTimesCircle />,
        color: 'error',
        type: 'outOfStock',
      },
      {
        title: 'Stock In Transactions',
        value: stats?.stockInTransactions ?? 0,
        icon: <FaArrowDown />,
        color: 'success',
        type: 'stockIn',
        subtitle: 'Click to view in Transactions',
      },
      {
        title: 'Stock Out Transactions',
        value: stats?.stockOutTransactions ?? 0,
        icon: <FaArrowUp />,
        color: 'info',
        type: 'stockOut',
        subtitle: 'Click to view in Transactions',
      },
    ];

    return cards.map((card) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={card.type}>
        <StatCard
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          subtitle={card.subtitle}
          onClick={() => handleCardClick(card)}
        />
      </Grid>
    ));
  };

  const renderActivity = () => {
    if (activityLoading) {
      return (
        <Stack spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 1 }} />
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
      <List disablePadding>
        {recentActivity.map((item, idx) => (
          <Box key={item.id || item._id || idx}>
            <ListItem sx={{ px: 0, py: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, mr: 2, flexShrink: 0 }}>
                {String((item.requestedBy || item.processedBy || item.type || 'U').charAt(0)).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {item.typeLabel || item.item || item.name || 'Activity'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(() => {
                    const parts = [];
                    if (item.kind === 'transaction') {
                      if (item.requestedBy) parts.push(`Requested by: ${item.requestedBy}`);
                      if (item.processedBy) parts.push(`Processed by: ${item.processedBy}`);
                      if (typeof item.quantity !== 'undefined' && item.quantity !== null)
                        parts.push(`Qty: ${item.quantity}`);
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
              <Box sx={{ textAlign: 'right', minWidth: 120, flexShrink: 0 }}>
                <Tooltip
                  title={
                    item.createdAt
                      ? dayjs.utc(item.createdAt).tz(PH_TZ).format('D MMM YYYY, h:mm A')
                      : ''
                  }
                >
                  <Typography variant="caption" color="text.secondary">
                    {item.createdAt ? dayjs.utc(item.createdAt).tz(PH_TZ).fromNow() : ''}
                  </Typography>
                </Tooltip>
              </Box>
            </ListItem>
            {idx < recentActivity.length - 1 && <Divider />}
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

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {renderStatCards()}
      </Grid>

      {/* Recent Activity — full width */}
      <Box sx={{ width: '100%' }}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Recent Activity
            </Typography>
            {renderActivity()}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DashboardPage;
