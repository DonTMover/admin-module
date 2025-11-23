import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';

export default function NotAuthenticated() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Grid container spacing={4} maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Grid item xs={12} md={5}>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, height: '100%' }}>
            <Stack spacing={2.5} alignItems="flex-start">
              <LockOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h5" fontWeight={600}>
                Не авторизован
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Для доступа к панели войдите в систему. Если аккаунта ещё нет — создайте первую учётную запись администратора.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ pt: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={() => navigate('/admin/login')}>
                  Войти
                </Button>
                <Button variant="outlined" onClick={() => navigate('/auth/register')}>
                  Регистрация
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ pt: 2 }}>
                Ошибка 401 · Доступ запрещён
              </Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper
            elevation={1}
            sx={{
              p: 4,
              borderRadius: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Добро пожаловать в админ‑модуль
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Здесь вы можете управлять пользователями и внутренними сущностями приложения. Для начала войдите под своей учётной записью
              или создайте первого администратора, если система запускается впервые.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Интерфейс адаптирован под современные разрешения и следует принципам Material Design 3 для удобной работы каждый день.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
