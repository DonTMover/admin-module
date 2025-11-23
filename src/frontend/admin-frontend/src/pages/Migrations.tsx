import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, CardHeader, CircularProgress, Stack, Typography } from '@mui/material';
import { migrationsStatus, migrationsUpgradeHead } from '../services/api';

export default function MigrationsPage() {
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['migrations-status'],
    queryFn: migrationsStatus,
  });

  const upgradeMutation = useMutation({
    mutationFn: migrationsUpgradeHead,
    onSuccess: (res) => {
      setLastMessage(res.message);
    },
  });

  const running = upgradeMutation.isPending;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 600 }}>
        <CardHeader title="Миграции базы данных" subheader="Alembic · upgrade head" />
        <CardContent>
          <Stack spacing={2}>
            {isLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2">Загружаю статус миграций…</Typography>
              </Stack>
            )}
            {isError && <Alert severity="error">Не удалось получить статус миграций.</Alert>}
            {data && data.status === 'ok' && !isLoading && !isError && (
              <Alert severity="success">Сервис миграций доступен.</Alert>
            )}

            {upgradeMutation.isError && (
              <Alert severity="error">
                {(upgradeMutation.error as any)?.response?.data?.detail ?? 'Ошибка при выполнении миграций.'}
              </Alert>
            )}
            {lastMessage && !upgradeMutation.isError && (
              <Alert severity="success">{lastMessage}</Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              Эта операция выполнит <code>alembic upgrade head</code> на сервере. Доступна только для администраторов.
            </Typography>

            <Box>
              <Button
                variant="contained"
                color="primary"
                disabled={running}
                onClick={() => upgradeMutation.mutate()}
              >
                {running ? 'Выполняю миграции…' : 'Выполнить upgrade head'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
