import { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { QrCodeScanner, AdminPanelSettings } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';

export default function Header() {
  const { mode, setMode, storeId, stores } = useAppContext();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box 
          component="img" 
          src="/logo.png" 
          alt="MQcafe Logo" 
          sx={{ height: 40, mr: 1.5, objectFit: 'contain' }} 
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, ml: 1, letterSpacing: '-0.5px', color: '#1e293b' }}>
            MQcafe : <span style={{ color: '#10b981' }}>{stores.find((s:any) => s.id === storeId)?.name?.replace('MQcafe ', '') || '매장 선택'}</span>
          </Typography>
          <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5, fontWeight: 700 }}>
            현재 일시: {currentTime}
          </Typography>
        </Box>
      </Box>
      <Box>
        <Button 
          variant={mode === 'customer' ? 'contained' : 'outlined'} 
          color="success"
          onClick={() => setMode('customer')}
          sx={{ mr: 1, borderRadius: '20px', textTransform: 'none' }}
          startIcon={<QrCodeScanner />}
        >
          고객 모바일 (QR)
        </Button>
        <Button 
          variant={mode === 'admin' ? 'contained' : 'outlined'} 
          color="secondary"
          onClick={() => setMode('admin')}
          sx={{ borderRadius: '20px', textTransform: 'none' }}
          startIcon={<AdminPanelSettings />}
        >
          어드민 대시보드
        </Button>
      </Box>
    </Box>
  );
}
