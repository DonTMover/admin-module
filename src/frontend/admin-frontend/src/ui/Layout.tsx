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
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Панель администратора
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <Button color="inherit" component={Link} to="/admin" size="small">
              Dashboard
            </Button>
            <Button color="inherit" component={Link} to="/auth/register" size="small">
              Register
            </Button>
            {token && (
              <Button color="inherit" component={Link} to="/admin/profile" size="small" startIcon={<AccountCircleIcon fontSize="small" />}>
                Profile
              </Button>
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
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Container>
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 2, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            © 2025 Admin Module
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
