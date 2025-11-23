import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from '../services/api';
import { Alert, Box, Button, Card, CardContent, CardHeader, Grid, Skeleton, Typography } from '@mui/material';

export default function Profile() {
  const { data: user, isLoading } = useQuery({ queryKey: ['currentUser'], queryFn: fetchCurrentUser });

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Skeleton variant="text" width={180} height={32} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={80} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={80} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={80} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!user) {
    return <Alert severity="error">Не удалось получить профиль пользователя.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Профиль
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardHeader title="Email" />
            <CardContent>
              <Typography variant="body1">{user.email}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardHeader title="Имя" />
            <CardContent>
              <Typography variant="body1">{user.full_name || '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3 }}>
            <CardHeader title="Логинов" />
            <CardContent>
              <Typography variant="body1">{user.login_count}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => {
            localStorage.removeItem('access_token');
            window.location.href = '/admin/login';
          }}
        >
          Выйти из аккаунта
        </Button>
      </Box>
    </Box>
  );
}
