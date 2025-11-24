import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, CardHeader, Stack, TextField, Typography } from '@mui/material';
import { login } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Неверные данные';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3, boxShadow: 3 }}>
        <CardHeader
          title="Вход"
          subheader="Авторизуйтесь для доступа к панели администратора"
        />
        <CardContent>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.5}>
              {error && (
                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{
                    animation: 'fadeInOut 4s ease',
                    '@keyframes fadeInOut': {
                      '0%': { opacity: 0, transform: 'translateY(-4px)' },
                      '10%': { opacity: 1, transform: 'translateY(0)' },
                      '90%': { opacity: 1, transform: 'translateY(0)' },
                      '100%': { opacity: 0, transform: 'translateY(-4px)' },
                    },
                  }}
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}
              <TextField
                name="email"
                type="email"
                label="Email"
                required
                fullWidth
                autoComplete="email"
                size="small"
              />
              <TextField
                name="password"
                type="password"
                label="Пароль"
                required
                fullWidth
                autoComplete="current-password"
                size="small"
              />
              <Button type="submit" variant="contained" fullWidth disabled={loading} size="medium">
                {loading ? 'Вход...' : 'Войти'}
              </Button>
              <Typography variant="body2" color="text.secondary" align="center">
                Нет аккаунта? <Button size="small" variant="text" onClick={() => navigate('/auth/register')}>Создать администратора</Button>
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
