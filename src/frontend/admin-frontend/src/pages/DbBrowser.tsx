import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, CardHeader, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Pagination } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { deleteDbRow, fetchDbTableMeta, fetchDbTables, fetchDbTableRows, insertDbRow, updateDbRow } from '../services/api';
import type { DbTable, DbTableRowsResponse, DbTableMeta } from '../services/api';
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
  const queryClient = useQueryClient();

  const { data: tables, isLoading: loadingTables, error: tablesError } = useQuery({
    queryKey: ['db-tables'],
    queryFn: fetchDbTables,
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
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, values }: { key: Record<string, any>; values: Record<string, any> }) =>
      updateDbRow(selected!.schema, selected!.name, key, values),
    onSuccess: () => {
      setEditRow(null);
      setFormValues({});
      queryClient.invalidateQueries({ queryKey: ['db-rows', selected?.schema, selected?.name] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: Record<string, any>) => deleteDbRow(selected!.schema, selected!.name, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-rows', selected?.schema, selected?.name] });
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

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={600}>
        Обозреватель базы данных
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch">
        <Card sx={{ flexBasis: { xs: '100%', md: '30%' }, borderRadius: 3, boxShadow: 1 }}>
          <CardHeader title="Таблицы" subheader="Доступные пользовательские таблицы" />
          <CardContent>
            {tablesError && <Alert severity="error">Не удалось загрузить список таблиц</Alert>}
            {loadingTables ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
                <Skeleton variant="rectangular" height={32} />
              </Stack>
            ) : (
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
                      {col.is_primary_key && ' (PK)'}
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
                <TextField
                  key={col.name}
                  label={`${col.name} (${col.data_type})`}
                  size="small"
                  fullWidth
                  disabled={col.is_primary_key && !!editRow}
                  value={formValues[col.name] ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleFormChange(col.name, event.target.value)}
                />
              ))}
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
                if (editRow) {
                  const key = currentKey(editRow);
                  updateMutation.mutate({ key, values: formValues });
                } else {
                  insertMutation.mutate(formValues);
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
    </Stack>
  );
}
