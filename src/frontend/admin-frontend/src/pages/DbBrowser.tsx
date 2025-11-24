import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Pagination, IconButton, Tooltip } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { activateDbConnection, createDbConnection, createDbTable, deleteDbRow, dropDbTable, fetchDbConnections, fetchDbTableMeta, fetchDbTables, fetchDbTableRows, insertDbRow, testDbConnection, updateDbRow } from '../services/api';
import type { CreateTablePayload, DbConnectionInfo, DbTable, DbTableRowsResponse, DbTableMeta, NewTableColumn } from '../services/api';
import AddIcon from '@mui/icons-material/Add';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 25;

export default function DbBrowser() {
  const [selected, setSelected] = useState<DbTable | null>(null);
  const [page, setPage] = useState(1);
  const [isInsertOpen, setInsertOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, any> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [deleteRow, setDeleteRow] = useState<Record<string, any> | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [isConnDialogOpen, setConnDialogOpen] = useState(false);
  const [connName, setConnName] = useState('');
  const [connDsn, setConnDsn] = useState('');
  const [connReadOnly, setConnReadOnly] = useState(false);
  const [connHost, setConnHost] = useState('localhost');
  const [connPort, setConnPort] = useState('5432');
  const [connDb, setConnDb] = useState('');
  const [connUser, setConnUser] = useState('');
  const [connPassword, setConnPassword] = useState('');
  const [connMode, setConnMode] = useState<'fields' | 'dsn'>('fields');
  const [isCreateTableOpen, setCreateTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableSchema, setNewTableSchema] = useState('public');
  const [newTableColumns, setNewTableColumns] = useState<NewTableColumn[]>([
    { name: 'id', kind: 'id', primary_key: true },
  ]);
  const [tableToDrop, setTableToDrop] = useState<DbTable | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markdownPreview, setMarkdownPreview] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: tables, isLoading: loadingTables, error: tablesError } = useQuery({
    queryKey: ['db-tables'],
    queryFn: fetchDbTables,
  });

  const { data: connections } = useQuery<DbConnectionInfo[]>({
    queryKey: ['db-connections'],
    queryFn: fetchDbConnections,
  });

  const { data: rowsData, isLoading: loadingRows, error: rowsError } = useQuery<DbTableRowsResponse>({
    queryKey: ['db-rows', selected?.schema, selected?.name, page],
    queryFn: () => fetchDbTableRows(selected!.schema, selected!.name, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    enabled: !!selected,
  });

  const { data: meta, isLoading: loadingMeta, error: metaError } = useQuery<DbTableMeta>({
    queryKey: ['db-meta', selected?.schema, selected?.name],
    queryFn: () => fetchDbTableMeta(selected!.schema, selected!.name),
    enabled: !!selected,
  });

  const insertMutation = useMutation({
    mutationFn: (values: Record<string, any>) => insertDbRow(selected!.schema, selected!.name, values),
    onSuccess: () => {
      setInsertOpen(false);
      setFormValues({});
      queryClient.invalidateQueries({ queryKey: ['db-rows', selected?.schema, selected?.name] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail ?? 'Ошибка при добавлении строки';
      setErrorMessage(String(msg));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, values }: { key: Record<string, any>; values: Record<string, any> }) =>
      updateDbRow(selected!.schema, selected!.name, key, values),
    onSuccess: () => {
      setEditRow(null);
      setFormValues({});
      queryClient.invalidateQueries({ queryKey: ['db-rows', selected?.schema, selected?.name] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail ?? 'Ошибка при обновлении строки';
      setErrorMessage(String(msg));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: Record<string, any>) => deleteDbRow(selected!.schema, selected!.name, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-rows', selected?.schema, selected?.name] });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail ?? 'Ошибка при удалении строки';
      setErrorMessage(String(msg));
    },
  });

  const handleSelect = (schema: string, name: string) => {
    const tbl = tables?.find((t) => t.schema === schema && t.name === name) || null;
    setSelected(tbl);
    setPage(1);
  };

  const total = rowsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = rowsData?.rows ?? [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const primaryKeyColumns = useMemo(() => meta?.primary_key ?? [], [meta]);

  const currentKey = (row: Record<string, any>): Record<string, any> => {
    const key: Record<string, any> = {};
    (primaryKeyColumns || []).forEach((col) => {
      if (col in row) key[col] = row[col];
    });
    return key;
  };

  const openInsertDialog = () => {
    const initial: Record<string, any> = {};
    (meta?.columns || []).forEach((col) => {
      // для авто-ID и колонок с default ничего не заполняем
      if (col.is_primary_key && col.name === 'id') {
        return;
      }
      if (!col.has_default && col.is_nullable) {
        initial[col.name] = '';
      }
    });
    setFormValues(initial);
    setInsertOpen(true);
  };

  const openEditDialog = (row: Record<string, any>) => {
    setEditRow(row);
    setFormValues(row);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const activeConnectionId = useMemo(
    () => connections?.find((c) => c.active)?.id ?? 0,
    [connections],
  );

  const effectiveDsn = useMemo(() => {
    if (connMode === 'dsn') {
      return connDsn;
    }
    if (!connUser || !connPassword || !connDb || !connHost || !connPort) {
      return '';
    }
    return `postgresql+asyncpg://${encodeURIComponent(connUser)}:${encodeURIComponent(connPassword)}@${connHost}:${connPort}/${connDb}`;
  }, [connMode, connDsn, connUser, connPassword, connHost, connPort, connDb]);

  const addTableColumn = () => {
    setNewTableColumns((prev) => [
      ...prev,
      { name: '', kind: 'string', required: false, unique: false },
    ]);
  };

  const updateTableColumn = (index: number, patch: Partial<NewTableColumn>) => {
    setNewTableColumns((prev) => prev.map((col, i) => (i === index ? { ...col, ...patch } : col)));
  };

  const removeTableColumn = (index: number) => {
    setNewTableColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) return;
    const payload: CreateTablePayload = {
      schema: newTableSchema || 'public',
      name: newTableName.trim(),
      columns: newTableColumns,
    };
    try {
      await createDbTable(payload);
      await queryClient.invalidateQueries({ queryKey: ['db-tables'] });
      setCreateTableOpen(false);
      setNewTableName('');
      setNewTableSchema('public');
      setNewTableColumns([{ name: 'id', kind: 'id', primary_key: true }]);
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? 'Не удалось создать таблицу';
      setErrorMessage(String(msg));
    }
  };

  return (
    <Stack spacing={3}>
      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 1,
            animation: 'fadeInOut 4s ease',
            '@keyframes fadeInOut': {
              '0%': { opacity: 0, transform: 'translateY(-4px)' },
              '10%': { opacity: 1, transform: 'translateY(0)' },
              '90%': { opacity: 1, transform: 'translateY(0)' },
              '100%': { opacity: 0, transform: 'translateY(-4px)' },
            },
          }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}
      <Typography variant="h5" fontWeight={600}>
        Обозреватель базы данных
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        <Card
          sx={{
            position: 'relative',
            flexShrink: 0,
            borderRadius: 3,
            boxShadow: 1,
            overflow: 'hidden',
            width: { xs: '100%', md: 96 },
            transition: 'width 0.25s ease',
            '&:hover': {
              width: { xs: '100%', md: 260 },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selected ? 'Таблицы' : 'Таблицы (выберите таблицу)'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: 'none', md: 'inline' },
              }}
            >
              DB
            </Typography>
          </Box>
          <CardContent>
            {connections && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Подключение к БД
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" fullWidth>
                    <InputLabel>Подключение</InputLabel>
                    <Select
                      label="Подключение" 
                      value={String(activeConnectionId)}
                      onChange={async (event: SelectChangeEvent<string>) => {
                        const id = Number(event.target.value);
                        await activateDbConnection(id);
                        queryClient.invalidateQueries({ queryKey: ['db-connections'] });
                        queryClient.invalidateQueries({ queryKey: ['db-tables'] });
                        setSelected(null);
                      }}
                    >
                      {connections.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>
                          {c.name} {c.read_only ? '(RO)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button size="small" variant="outlined" onClick={() => setConnDialogOpen(true)}>
                    Новое
                  </Button>
                </Stack>
              </Box>
            )}
            {tablesError && <Alert severity="error">Не удалось загрузить список таблиц</Alert>}
            {loadingTables ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl fullWidth size="small">
                    <InputLabel>Таблица</InputLabel>
                    <Select
                      label="Таблица"
                      value={selected ? `${selected.schema}.${selected.name}` : ''}
                      onChange={(event: SelectChangeEvent) => {
                        const [schema, name] = String(event.target.value).split('.');
                        handleSelect(schema, name);
                      }}
                    >
                      {(tables || []).map((t) => (
                        <MenuItem key={`${t.schema}.${t.name}`} value={`${t.schema}.${t.name}`}>
                          {t.schema}.{t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setCreateTableOpen(true)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  {selected && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => setTableToDrop(selected)}
                    >
                      Удалить
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ flexGrow: 1, borderRadius: 3, boxShadow: 1 }}>
          <CardHeader
            title={selected ? `${selected.schema}.${selected.name}` : 'Выберите таблицу'}
            subheader={
              selected
                ? `Показаны строки ${rows.length} из ${total}$${meta ? ` · PK: ${meta.primary_key.join(', ') || 'нет'}` : ''}`
                : undefined
            }
          />
          <CardContent>
            {!selected && <Typography color="text.secondary">Выберите таблицу слева, чтобы посмотреть данные.</Typography>}
            {metaError && <Alert severity="error">Ошибка загрузки метаданных таблицы</Alert>}
            {rowsError && <Alert severity="error">Ошибка загрузки данных таблицы</Alert>}
            {selected && !loadingMeta && meta && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Колонки
                </Typography>
                <Stack spacing={0.5}>
                  {meta.columns.map((col) => (
                    <Typography key={col.name} variant="caption" color="text.secondary">
                      {col.name} — {col.data_type}
                      {col.is_primary_key && (
                        <Tooltip
                          title="PK (Primary Key) — уникальный идентификатор строки в таблице"
                          placement="top"
                        >
                          <Box component="span" sx={{ ml: 0.5, cursor: 'help', textDecoration: 'dotted underline' }}>
                            (PK)
                          </Box>
                        </Tooltip>
                      )}
                      {col.is_unique && !col.is_primary_key && ' (UNIQUE)'}
                      {!col.is_nullable && ' · NOT NULL'}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
            {selected && (
              <Box mb={2} display="flex" gap={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={openInsertDialog}
                  disabled={readOnly || !!insertMutation.isPending}
                >
                  Добавить строку
                </Button>
                <Button
                  variant={readOnly ? 'contained' : 'outlined'}
                  size="small"
                  color={readOnly ? 'secondary' : 'inherit'}
                  onClick={() => setReadOnly((prev) => !prev)}
                >
                  {readOnly ? 'Режим чтения включен' : 'Режим чтения'}
                </Button>
              </Box>
            )}
            {selected && loadingRows && (
              <Stack spacing={1.5}>
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
              </Stack>
            )}
            {selected && !loadingRows && (
              <>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Действия</TableCell>
                        {columns.map((c) => (
                          <TableCell key={c}>{c}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" disabled={readOnly} onClick={() => openEditDialog(row)}>
                                Edit
                              </Button>
                              {primaryKeyColumns.length > 0 && !readOnly && (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => setDeleteRow(row)}
                                >
                                  Delete
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                          {columns.map((c) => (
                            <TableCell key={c}>
                              {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {!loadingRows && rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={(columns.length || 1) + 1} align="center">
                            <Typography variant="body2" color="text.secondary">
                              Таблица пуста.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {total > PAGE_SIZE && (
                  <Box mt={2} display="flex" justifyContent="center">
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_event: React.ChangeEvent<unknown>, value: number) => setPage(value)}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Диалог добавления / редактирования строки */}
      {(isInsertOpen || editRow) && meta && (
        <Dialog open onClose={() => { setInsertOpen(false); setEditRow(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>{editRow ? 'Редактировать строку' : 'Добавить строку'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {meta.columns.map((col) => (
                // при создании новой строки прячем авто-ID
                (isInsertOpen && !editRow && col.is_primary_key && col.name === 'id') ? null : (
                <TextField
                  key={col.name}
                  label={`${col.name} (${col.data_type})`}
                  size="small"
                  fullWidth
                  disabled={col.is_primary_key && !!editRow}
                  value={formValues[col.name] ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const value = event.target.value;
                    handleFormChange(col.name, value);
                    if (col.data_type.toLowerCase().includes('text')) {
                      setMarkdownPreview(value);
                    }
                  }}
                  helperText={col.data_type.toLowerCase().includes('text') ? 'Поддерживается Markdown: заголовки, списки, ссылки и т.д.' : undefined}
                  multiline={col.data_type.toLowerCase().includes('text')}
                  minRows={col.data_type.toLowerCase().includes('text') ? 3 : undefined}
                />
                )
              ))}
              {markdownPreview && (
                <Box mt={2} p={1.5} sx={{ borderRadius: 1, border: '1px dashed rgba(0,0,0,0.2)', bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Черновой предпросмотр Markdown
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {markdownPreview}
                  </Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setInsertOpen(false);
                setEditRow(null);
                setFormValues({});
              }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                const castValues = { ...formValues };
                // простое приведение типов на основе data_type
                (meta?.columns || []).forEach((col) => {
                  const v = castValues[col.name];
                  if (v === undefined || v === '') return;
                  const t = col.data_type.toLowerCase();
                  if (t.includes('integer') || t.includes('numeric')) {
                    const n = Number(v);
                    if (!Number.isNaN(n)) castValues[col.name] = n;
                  } else if (t.includes('boolean')) {
                    const s = String(v).toLowerCase();
                    castValues[col.name] = s === 'true' || s === '1' || s === 'yes';
                  }
                });
                if (editRow) {
                  const key = currentKey(editRow);
                  updateMutation.mutate({ key, values: castValues });
                } else {
                  insertMutation.mutate(castValues);
                }
              }}
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Диалог подтверждения удаления */}
      {deleteRow && (
        <Dialog
          open
          onClose={() => setDeleteRow(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Подтверждение удаления</DialogTitle>
          <DialogContent>
            <Typography variant="body2" mt={1} mb={1}>
              Удалить выбранную строку? Это действие необратимо.
            </Typography>
            {primaryKeyColumns.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Ключ: {primaryKeyColumns.map((col) => `${col}=${String(deleteRow[col])}`).join(', ')}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteRow(null)}>Отмена</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                const key = currentKey(deleteRow);
                deleteMutation.mutate(key);
                setDeleteRow(null);
              }}
            >
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Диалог создания нового подключения */}
      {isConnDialogOpen && (
        <Dialog open onClose={() => setConnDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Новое подключение к БД</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Название"
                size="small"
                fullWidth
                value={connName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnName(event.target.value)}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant={connMode === 'fields' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setConnMode('fields')}
                >
                  Поля
                </Button>
                <Button
                  variant={connMode === 'dsn' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setConnMode('dsn')}
                >
                  DSN
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Заполните поля или введите готовую строку DSN.
                </Typography>
              </Stack>
              {connMode === 'fields' ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="Тип"
                    size="small"
                    fullWidth
                    value="PostgreSQL"
                    disabled
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label="Хост"
                      size="small"
                      fullWidth
                      value={connHost}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnHost(event.target.value)}
                    />
                    <TextField
                      label="Порт"
                      size="small"
                      fullWidth
                      value={connPort}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnPort(event.target.value)}
                    />
                  </Stack>
                  <TextField
                    label="База данных"
                    size="small"
                    fullWidth
                    value={connDb}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnDb(event.target.value)}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label="Пользователь"
                      size="small"
                      fullWidth
                      value={connUser}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnUser(event.target.value)}
                    />
                    <TextField
                      label="Пароль"
                      type="password"
                      size="small"
                      fullWidth
                      value={connPassword}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnPassword(event.target.value)}
                    />
                  </Stack>
                  <TextField
                    label="Итоговый DSN"
                    size="small"
                    fullWidth
                    value={effectiveDsn || 'Заполните все поля выше'}
                    disabled
                  />
                </Stack>
              ) : (
                <TextField
                  label="DSN (postgresql+asyncpg://user:pass@host:port/db)"
                  size="small"
                  fullWidth
                  value={connDsn}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConnDsn(event.target.value)}
                />
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant={connReadOnly ? 'contained' : 'outlined'}
                  size="small"
                  color={connReadOnly ? 'secondary' : 'inherit'}
                  onClick={() => setConnReadOnly((prev) => !prev)}
                >
                  {connReadOnly ? 'Read-only' : 'RW'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Read-only рекомендуется для боевых баз.
                </Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setConnDialogOpen(false);
                setConnName('');
                setConnDsn('');
                setConnHost('localhost');
                setConnPort('5432');
                setConnDb('');
                setConnUser('');
                setConnPassword('');
                setConnMode('fields');
                setConnReadOnly(false);
              }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              disabled={!effectiveDsn}
              onClick={async () => {
                try {
                  if (!effectiveDsn) return;
                  await testDbConnection(effectiveDsn);
                  const created = await createDbConnection(connName || 'custom', effectiveDsn, connReadOnly);
                  await activateDbConnection(created.id);
                  queryClient.invalidateQueries({ queryKey: ['db-connections'] });
                  queryClient.invalidateQueries({ queryKey: ['db-tables'] });
                  setSelected(null);
                  setConnDialogOpen(false);
                  setConnName('');
                  setConnDsn('');
                  setConnHost('localhost');
                  setConnPort('5432');
                  setConnDb('');
                  setConnUser('');
                  setConnPassword('');
                  setConnMode('fields');
                  setConnReadOnly(false);
                } catch (error) {
                  // Ошибка теста или создания подключения отобразится через Alert, если добавить хэндлинг; пока просто не закрываем диалог
                  console.error(error);
                }
              }}
            >
              Сохранить и активировать
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Диалог создания новой таблицы */}
      {isCreateTableOpen && (
        <Dialog open onClose={() => setCreateTableOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Новая таблица</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Схема"
                size="small"
                fullWidth
                value={newTableSchema}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewTableSchema(event.target.value)}
                helperText="Обычно public"
              />
              <TextField
                label="Имя таблицы"
                size="small"
                fullWidth
                value={newTableName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewTableName(event.target.value)}
                helperText="Латиница, без пробелов, например user_profile"
              />
              <Typography variant="subtitle2">Колонки</Typography>
              <Stack spacing={1.5}>
                {newTableColumns.map((col, index) => (
                  <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    <TextField
                      label="Имя"
                      size="small"
                      value={col.name}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateTableColumn(index, { name: event.target.value })
                      }
                      sx={{ flex: 2 }}
                    />
                    <FormControl size="small" sx={{ flex: 2 }}>
                      <InputLabel>Тип</InputLabel>
                      <Select
                        label="Тип"
                        value={col.kind}
                        onChange={(event: SelectChangeEvent<NewTableColumn['kind']>) =>
                          updateTableColumn(index, { kind: event.target.value as NewTableColumn['kind'] })
                        }
                      >
                        <MenuItem value="id">ID (авто-нумерация)</MenuItem>
                        <MenuItem value="string">Короткий текст</MenuItem>
                        <MenuItem value="text">Длинный текст</MenuItem>
                        <MenuItem value="number">Число</MenuItem>
                        <MenuItem value="datetime">Дата/время</MenuItem>
                        <MenuItem value="boolean">Да/нет (флаг)</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Обязательное</InputLabel>
                      <Select
                        label="Обязательное"
                        value={col.required ? 'yes' : 'no'}
                        onChange={(event: SelectChangeEvent<string>) =>
                          updateTableColumn(index, { required: event.target.value === 'yes' })
                        }
                      >
                        <MenuItem value="no">Нет</MenuItem>
                        <MenuItem value="yes">Да</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>Уникальное</InputLabel>
                      <Select
                        label="Уникальное"
                        value={col.unique ? 'yes' : 'no'}
                        onChange={(event: SelectChangeEvent<string>) =>
                          updateTableColumn(index, { unique: event.target.value === 'yes' })
                        }
                      >
                        <MenuItem value="no">Нет</MenuItem>
                        <MenuItem value="yes">Да</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel>PK</InputLabel>
                      <Select
                        label="PK"
                        value={col.primary_key ? 'yes' : 'no'}
                        onChange={(event: SelectChangeEvent<string>) =>
                          updateTableColumn(index, { primary_key: event.target.value === 'yes' })
                        }
                      >
                        <MenuItem value="no">Нет</MenuItem>
                        <MenuItem value="yes">Да</MenuItem>
                      </Select>
                    </FormControl>
                    {index > 0 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeTableColumn(index)}
                      >
                        ×
                      </IconButton>
                    )}
                  </Stack>
                ))}
                <Button variant="text" size="small" onClick={addTableColumn} startIcon={<AddIcon fontSize="small" />}>
                  Добавить колонку
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateTableOpen(false)}>Отмена</Button>
            <Button variant="contained" onClick={handleCreateTable} disabled={!newTableName.trim()}>
              Создать таблицу
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Диалог подтверждения удаления таблицы */}
      {tableToDrop && (
        <Dialog
          open
          onClose={() => setTableToDrop(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Удалить таблицу</DialogTitle>
          <DialogContent>
            <Typography variant="body2" mt={1} mb={1}>
              Удалить таблицу {tableToDrop.schema}.{tableToDrop.name}? Все данные будут потеряны.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTableToDrop(null)}>Отмена</Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                await dropDbTable(tableToDrop.schema, tableToDrop.name);
                setTableToDrop(null);
                setSelected(null);
                await queryClient.invalidateQueries({ queryKey: ['db-tables'] });
              }}
            >
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
