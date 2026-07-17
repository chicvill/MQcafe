import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, List, ListItem, ListItemText, IconButton, Chip } from '@mui/material';
import { Delete as DeleteIcon, Nfc } from '@mui/icons-material';
import { API_URL } from '../../utils/constants';

interface MasterCardManagerProps {
  open: boolean;
  onClose: () => void;
  storeId: string | null;
  ownerId: string | null;
}

export default function MasterCardManager({ open, onClose, storeId, ownerId }: MasterCardManagerProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [cardName, setCardName] = useState('');

  const fetchCards = async () => {
    if (!ownerId) return;
    try {
      const res = await fetch(`${API_URL}/nfc/owner/cards?owner_id=${ownerId}`);
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCards();
    }
  }, [open, ownerId]);

  const handleRegister = async () => {
    if (!storeId || !ownerId) return;
    const finalName = cardName.trim() || '점주 마스터';
    
    try {
      const res = await fetch(`${API_URL}/nfc/owner/request_registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, owner_id: ownerId, card_name: finalName })
      });
      const data = await res.json();
      alert(data.message);
      setCardName('');
    } catch (e) {
      alert('오류가 발생했습니다.');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!ownerId) return;
    if (!window.confirm('이 마스터 카드의 권한을 영구 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`${API_URL}/nfc/owner/cards/${uid}?owner_id=${ownerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchCards();
      } else {
        alert(data.detail || '삭제 실패');
      }
    } catch (e) {
      alert('오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#f8fafc' }}>
        마스터 출입 카드 관리
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#1e293b', color: '#f8fafc', p: 3 }}>
        <Box sx={{ mb: 4, mt: 1, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#38bdf8' }}>
            새 마스터 카드 등록
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="카드 별칭 (예: 주말 알바생용)"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              sx={{
                input: { color: '#f8fafc' },
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 1
              }}
            />
            <Button variant="contained" color="primary" onClick={handleRegister} sx={{ minWidth: 80 }}>
              등록 시작
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
            * '등록 시작' 클릭 후 60초 이내에 매장 입구 단말기에 카드를 대주세요.
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#10b981' }}>
          등록된 마스터 카드 목록 ({cards.length})
        </Typography>
        
        {cards.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>
            등록된 마스터 카드가 없습니다.
          </Typography>
        ) : (
          <List sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
            {cards.map((c) => (
              <ListItem 
                key={c.uid}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(c.uid)} sx={{ color: '#ef4444' }}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <Nfc sx={{ mr: 2, color: '#94a3b8' }} />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>{c.user_name}</Typography>
                      <Chip label={c.uid.substring(0,6) + '...'} size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#334155', color: '#f8fafc' }} />
                    </Box>
                  }
                  secondary={<Typography variant="caption" sx={{ color: '#94a3b8' }}>등록일: {new Date(c.created_at).toLocaleString()}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ bgcolor: '#0f172a', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#94a3b8', fontWeight: 700 }}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
