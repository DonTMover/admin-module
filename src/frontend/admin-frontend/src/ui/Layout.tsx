import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Container, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function Layout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/admin/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar
          sx={{
            gap: 2,
            width: '100%',
            px: { xs: 2, sm: 3, md: 6, lg: 10 },
            maxWidth: 'lg',
            mx: 'auto',
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Панель администратора
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, ml: { xs: 1, sm: 2 } }}>
            <Button color="inherit" component={Link} to="/admin" size="small">
              Dashboard
            </Button>
            {token && (
              <>
                <Button color="inherit" component={Link} to="/admin/profile" size="small" startIcon={<AccountCircleIcon fontSize="small" />}>
                  Profile
                </Button>
                <Button color="inherit" component={Link} to="/admin/migrations" size="small">
                  Migrations
                </Button>
                <Button color="inherit" component={Link} to="/admin/db" size="small">
                  DB
                </Button>
              </>
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {token ? (
            <IconButton color="inherit" onClick={logout} size="small">
              <LogoutIcon fontSize="small" />
            </IconButton>
          ) : (
            <Button color="inherit" variant="outlined" size="small" component={Link} to="/admin/login">
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container
        maxWidth={false}
        sx={{
          flex: 1,
          py: 4,
          px: { xs: 2, sm: 3, md: 6, lg: 10 },
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: (theme: any) => theme.breakpoints.values.lg }}>
          <Outlet />
        </Box>
      </Container>
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 2, mt: 'auto' }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            © 2025 Admin Module
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
