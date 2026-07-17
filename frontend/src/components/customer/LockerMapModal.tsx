import { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Paper, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useUserContext } from '../../contexts/UserContext';
import { API_URL } from '../../utils/constants';

interface LockerMapModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
}

export default function LockerMapModal({ open, onClose, storeId }: LockerMapModalProps) {
  const { activeSession, setActiveSession } = useUserContext();
  const [lockers, setLockers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLockers();
    }
  }, [open, storeId]);

  const fetchLockers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/lockers?store_id=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setLockers(data.lockers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLockerClick = async (locker: any) => {
    if (locker.is_occupied) {
      alert('이미 사용 중인 사물함입니다. 빈 사물함을 선택해 주십시오.');
      return;
    }
    if (!activeSession) return;
    
    const lockerNo = locker.name.replace('번 사물함', '');
    if (!window.confirm(`정말 ${lockerNo}번 사물함을 배정받으시겠습니까?`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/lockers/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          new_locker_id: locker.id,
          store_id: storeId
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(data.message);
        setActiveSession({
          ...activeSession,
          metadata: {
            ...activeSession.metadata,
            locker_id: locker.id
          }
        });
        onClose();
      } else {
        alert(data.detail || '사물함 배정 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#ffffff',
            color: '#0f172a',
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
        사물함 선택
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: '#e2e8f0' }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3, fontWeight: 700 }}>
          원하시는 빈 사물함을 선택해 주십시오. (초록색: 선택 가능 / 회색: 사용 중)
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {lockers.map((locker) => {
              const isOccupied = locker.is_occupied;
              const isMine = activeSession?.metadata?.locker_id === locker.id;
              
              let bgColor = '#ffffff';
              let hoverBg = '#f8fafc';
              let border = '1px solid #10b981';
              let textColor = '#10b981';
              
              if (isOccupied) {
                if (isMine) {
                  bgColor = '#10b981';
                  hoverBg = '#059669';
                  border = '2px solid #10b981';
                  textColor = '#ffffff';
                } else {
                  bgColor = '#f1f5f9';
                  border = '1px solid #cbd5e1';
                  textColor = '#94a3b8';
                }
              }
              
              return (
                <Grid size={{ xs: 3 }} key={locker.id}>
                  <Paper
                    onClick={() => {
                      if (!isMine) handleLockerClick(locker);
                    }}
                    sx={{
                      p: 2,
                      bgcolor: bgColor,
                      color: textColor,
                      textAlign: 'center',
                      borderRadius: 3,
                      border: border,
                      cursor: isMine || isOccupied ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: (!isOccupied) ? hoverBg : bgColor,
                        transform: (!isOccupied) ? 'scale(1.05)' : 'none'
                      }
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {locker.name.replace('번 사물함', '')}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: 10, opacity: 0.8, fontWeight: 700 }}>
                      {isMine ? '내 사물함' : (isOccupied ? '사용중' : '선택가능')}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#ffffff', border: '1px solid #10b981', borderRadius: '50%' }} />
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>선택 가능</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '50%' }} />
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>사용 중</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#10b981', border: '1px solid #10b981', borderRadius: '50%' }} />
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>내 사물함</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 3, px: 4, fontWeight: 700 }}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
