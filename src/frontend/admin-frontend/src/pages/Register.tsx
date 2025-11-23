import type { FormEvent } from 'react';
import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardHeader, Stack, TextField, Typography } from '@mui/material';

export default function Register() {
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const full_name = (form.elements.namedItem('full_name') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const fd = new FormData();
    fd.append('email', email);
    fd.append('full_name', full_name);
    fd.append('password', password);
    try {
      const res = await fetch('/auth/register', { method: 'POST', body: fd });
      if (!res.ok) {
        setError('Email уже существует');
        return;
      }
      window.location.href = '/admin/login';
    } catch {
      setError('Ошибка подключения');
    }
  };

  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 3, boxShadow: 3 }}>
        <CardHeader
          title="Регистрация администратора"
          subheader="Создайте первую учетную запись для входа"
        />
        <CardContent>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.5}>
              {error && <Alert severity="error" variant="outlined">{error}</Alert>}
              <TextField
                name="email"
                type="email"
                label="Email"
                required
                fullWidth
                size="small"
              />
              <TextField
                name="full_name"
                type="text"
                label="Имя"
                fullWidth
                size="small"
              />
              <TextField
                name="password"
                type="password"
                label="Пароль"
                required
                inputProps={{ minLength: 6 }}
                fullWidth
                size="small"
              />
              <Button type="submit" variant="contained" fullWidth size="medium">
                Создать пользователя
              </Button>
              <Typography variant="body2" color="text.secondary" align="center">
                Уже есть аккаунт?{' '}
                <Button size="small" variant="text" href="/admin/login">
                  Войти
                </Button>
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
