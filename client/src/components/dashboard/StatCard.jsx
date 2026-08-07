import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
} from '@mui/material';
import {
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa';

const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  subtitle,
}) => {
  const getColorValue = (c) => {
    const map = {
      primary: 'primary.main',
      secondary: 'secondary.main',
      success: 'success.main',
      warning: 'warning.main',
      error: 'error.main',
      info: 'info.main',
    };
    return map[c] || map.primary;
  };

  const bgColor = getColorValue(color);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs="auto">
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: 'white',
                opacity: 0.9,
              }}
            >
              {icon}
            </Box>
          </Grid>
          <Grid item xs>
            <Typography
              variant="h5"
              component="div"
              fontWeight={700}
              gutterBottom
              sx={{ lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: 'block' }}
              >
                {subtitle}
              </Typography>
            )}
            {typeof trend !== 'undefined' && trend !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: trend >= 0 ? 'success.main' : 'error.main',
                    fontSize: 'caption.fontSize',
                    fontWeight: 600,
                  }}
                >
                  {trend >= 0 ? (
                    <FaArrowDown style={{ fontSize: 10, marginRight: 4 }} />
                  ) : (
                    <FaArrowUp style={{ fontSize: 10, marginRight: 4 }} />
                  )}
                  {Math.abs(trend)}%
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  vs last period
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StatCard;
