import { Drawer, Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { MeetingRoom, Logout } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';

interface AdminDrawerProps {
  onLogout: () => void;
}

export default function AdminDrawer({ onLogout }: AdminDrawerProps) {
  const { adminDrawerOpen, setAdminDrawerOpen } = useAppContext();

  const handleClose = () => setAdminDrawerOpen(false);

  return (
    <Drawer anchor="left" open={adminDrawerOpen} onClose={handleClose}>
      <Box sx={{ width: 280, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff' }}>
        <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a' }}>
            본사 관리자 메뉴
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            전체 가맹점 제어 및 모니터링
          </Typography>
        </Box>

        <List sx={{ pt: 2, flexGrow: 1 }}>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { handleClose(); window.open('/device_setup_guide.html', '_blank'); }}>
              <ListItemIcon><MeetingRoom sx={{ color: '#0284c7' }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>출입문 제어설정</Typography>} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={() => { handleClose(); onLogout(); }}>
              <ListItemIcon><Logout sx={{ color: '#ef4444' }} /></ListItemIcon>
              <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>로그아웃</Typography>} />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>MQcafe Admin v2.0</Typography>
        </Box>
      </Box>
    </Drawer>
  );
}
