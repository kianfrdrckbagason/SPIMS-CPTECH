import {
  Card,
  CardContent,
  Grid,
  Skeleton,
  Box,
} from '@mui/material';

const StatCardSkeleton = () => {
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
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Skeleton variant="circular" width={24} height={24} />
            </Box>
          </Grid>
          <Grid item xs>
            <Skeleton variant="rectangular" width="60%" height={32} sx={{ mb: 1, borderRadius: 1 }} />
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="30%" />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default StatCardSkeleton;
