import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../services/api';
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export default function Dashboard() {
  const { data: users, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const total = users?.length ?? 0;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={600}>
        Обзор пользователей
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        <Card sx={{ flexBasis: { xs: '100%', md: '30%' }, borderRadius: 3, boxShadow: 2 }}>
          <CardHeader title="Пользователи" subheader="Зарегистрированные учётные записи" />
          <CardContent>
            {isLoading ? (
              <Skeleton variant="rounded" width={120} height={32} />
            ) : (
              <Stack direction="row" alignItems="baseline" spacing={1}>
                <Typography variant="h4" fontWeight={600}>
                  {total}
                </Typography>
                <Chip label={total === 0 ? 'Нет пользователей' : 'Активно'} size="small" color={total === 0 ? 'default' : 'primary'} />
              </Stack>
            )}
          </CardContent>
        </Card>

        <Paper sx={{ flexGrow: 1, p: 2.5, borderRadius: 3, boxShadow: 1 }}>
          <Typography variant="subtitle1" fontWeight={500} gutterBottom>
            Список пользователей
          </Typography>
          {error && <Alert severity="error">Ошибка загрузки списка пользователей</Alert>}
          {isLoading ? (
            <Stack spacing={1.5} mt={1.5}>
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
              <Skeleton variant="rectangular" height={32} />
            </Stack>
          ) : (
            <TableContainer sx={{ mt: 1.5, maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Имя</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(users || []).map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.full_name || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && total === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Нет пользователей.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>
    </Stack>
  );
}
