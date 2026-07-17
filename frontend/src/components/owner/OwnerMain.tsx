import { useState } from 'react';
import { Box, Typography, Card, Button, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, Container, Paper, Divider, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Dashboard, Storefront, Receipt, Logout, QrCodeScanner, Nfc, MeetingRoom, SupportAgent, Close, HelpOutlined } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';

import { API_URL } from '../../utils/constants';

import SeatMonitor from './SeatMonitor';
import OwnerChatPanel from './OwnerChatPanel';
import AIAnalyzer from './AIAnalyzer';
import StoreEditor from './StoreEditor';
import AccountBook from './AccountBook';
import OwnerContract from './OwnerContract';
import MasterCardManager from './MasterCardManager';
import EventEngine from './EventEngine'; 

interface OwnerMainProps {
  fetchStores: () => Promise<void>;
}

export default function OwnerMain({ fetchStores }: OwnerMainProps) {
  const { stores, storeId, setStoreId, ownerId, setOwnerId, ownerDrawerOpen, setOwnerDrawerOpen, setMode } = useAppContext();

  const [isSignupMode, setIsSignupMode] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'account_book' | 'contract' | 'events'>('dashboard');
  const [openMasterCardManager, setOpenMasterCardManager] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digits = val.replace(/[^0-9]/g, '');
    let formatted = digits;

    if (digits.startsWith('02')) {
      if (digits.length <= 2) formatted = digits;
      else if (digits.length <= 5) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
      else if (digits.length <= 9) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      else {
        const trimmed = digits.slice(0, 10);
        formatted = `${trimmed.slice(0, 2)}-${trimmed.slice(2, 6)}-${trimmed.slice(6)}`;
      }
    } else {
      if (digits.length <= 3) formatted = digits;
      else if (digits.length <= 7) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      else if (digits.length <= 11) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
      else {
        const trimmed = digits.slice(0, 11);
        formatted = `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`;
      }
    }
    setPhoneInput(formatted);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput || !passwordInput) {
      alert('전화번호와 비밀번호를 입력해주세요.');
      return;
    }
    const endpoint = isSignupMode ? '/owner/signup' : '/owner/login';
    try {
      const body: any = { phone: phoneInput, password: passwordInput };
      if (isSignupMode) {
        body.name = nameInput;
        body.email = emailInput;
      }
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setOwnerId(data.owner_id);
        alert(isSignupMode ? '회원가입 완료! 로그인되었습니다.' : '로그인 되었습니다.');
      } else {
        alert(data.detail || '인증 실패');
      }
    } catch (e) {
      console.error(e);
      alert('서버 연결 오류');
    }
  };

  const handleLogout = () => {
    setOwnerId(null);
    setPhoneInput('');
    setPasswordInput('');
    setOwnerDrawerOpen(false);
  };

  const handleMasterNfcPairing = async () => {
    setOpenMasterCardManager(true);
    setOwnerDrawerOpen(false);
  };

  const handleRemoteDoorOpen = async () => {
    if (!window.confirm('현재 매장의 출입문을 원격으로 즉시 개방하시겠습니까?')) return;
    try {
      const res = await fetch(`${API_URL}/door/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(`출입문 개방 실패: ${data.detail || '알 수 없는 오류'}`);
      }
    } catch (e) {
      alert('출입문 개방 중 오류가 발생했습니다.');
    }
  };


  if (!ownerId) {
    return (
      <Container maxWidth="xs" sx={{ mt: 10 }}>
        <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            점주 {isSignupMode ? '회원가입' : '로그인'}
          </Typography>
          <form onSubmit={handleAuth}>
            {isSignupMode && (
              <>
                <TextField 
                  fullWidth label="이름" 
                  variant="outlined" sx={{ mb: 2 }} 
                  value={nameInput} onChange={e => setNameInput(e.target.value)}
                />
                <TextField 
                  fullWidth label="이메일" type="email"
                  variant="outlined" sx={{ mb: 2 }} 
                  value={emailInput} onChange={e => setEmailInput(e.target.value)}
                />
              </>
            )}
            <TextField 
              fullWidth label="전화번호" 
              type="tel"
              variant="outlined" sx={{ mb: 2 }} 
              value={phoneInput} onChange={handlePhoneChange}
              slotProps={{ input: { inputMode: 'numeric' } }}
            />
            <TextField 
              fullWidth label="비밀번호" 
              type="password" variant="outlined" sx={{ mb: 3 }} 
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
            />
            <Button fullWidth type="submit" variant="contained" size="large" sx={{ borderRadius: 2, fontWeight: 700, mb: 2 }}>
              {isSignupMode ? '회원가입' : '로그인'}
            </Button>
            <Button fullWidth variant="text" onClick={() => setIsSignupMode(!isSignupMode)}>
              {isSignupMode ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </Button>
          </form>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ mt: 2, position: 'relative' }}>
      
      {/* Drawer Menu */}
      <Drawer anchor="left" open={ownerDrawerOpen} onClose={() => setOwnerDrawerOpen(false)}>
        <Box sx={{ width: 280, p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, pl: 2 }}>MQcafe 점주 메뉴</Typography>
          
          <Typography variant="caption" sx={{ pl: 2, color: '#64748b', fontWeight: 700 }}>매장 선택</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            slotProps={{ select: { native: true } }}
            sx={{ mb: 3, mt: 1, px: 2 }}
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </TextField>

          <List>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><Dashboard color={activeTab === 'dashboard' ? 'primary' : 'inherit'} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'dashboard' ? 700 : 500 }}>매장 대시보드</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === 'editor'} onClick={() => { setActiveTab('editor'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><Storefront color={activeTab === 'editor' ? 'primary' : 'inherit'} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'editor' ? 700 : 500 }}>매장 환경 설정</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === 'account_book'} onClick={() => { setActiveTab('account_book'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><Receipt color={activeTab === 'account_book' ? 'primary' : 'inherit'} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'account_book' ? 700 : 500 }}>매출 내역/장부</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === 'contract'} onClick={() => { setActiveTab('contract'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><Receipt color={activeTab === 'contract' ? 'primary' : 'inherit'} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'contract' ? 700 : 500 }}>매장 개설/계약 관리</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={activeTab === 'events'} onClick={() => { setActiveTab('events'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><Storefront color={activeTab === 'events' ? 'primary' : 'inherit'} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: activeTab === 'events' ? 700 : 500 }}>자동 이벤트 규칙 관리</Typography>} />
              </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 2 }} />
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setMode('qr_poster'); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><QrCodeScanner /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>포스터 인쇄</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleMasterNfcPairing}>
                <ListItemIcon><Nfc color="primary" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#0284c7' }}>마스터 출입 카드 관리</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { handleRemoteDoorOpen(); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><MeetingRoom color="error" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#e11d48' }}>출입문 원격 개방</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setChatModalOpen(true); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><SupportAgent color="success" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#10b981' }}>실시간 1:1 고객 채팅</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setAiModalOpen(true); setOwnerDrawerOpen(false); }}>
                <ListItemIcon><HelpOutlined sx={{ color: '#8b5cf6' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, color: '#8b5cf6' }}>AI 경영 컨설턴트</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><Logout color="error" /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700 }}>로그아웃</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ px: 2 }}>
        {activeTab === 'editor' && <StoreEditor fetchStores={fetchStores} />}
        {activeTab === 'account_book' && <AccountBook fetchStores={fetchStores} />}
        {activeTab === 'contract' && <OwnerContract fetchStores={fetchStores} />}
        {activeTab === 'events' && <EventEngine fetchStores={fetchStores} />}
        
        {activeTab === 'dashboard' && (
          <Grid container spacing={3}>
            {/* [B-1] 좌석 현황 모니터 */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ bgcolor: '#1e293b', p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #334155', height: '100%', minHeight: '620px' }}>
                <SeatMonitor onOpenChat={() => setChatModalOpen(true)} />
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* 마스터 카드 관리 모달 */}
      <MasterCardManager 
        open={openMasterCardManager} 
        onClose={() => setOpenMasterCardManager(false)} 
        storeId={storeId} 
        ownerId={ownerId} 
      />

      {/* 실시간 1:1 고객 채팅 모달 */}
      <Dialog 
        open={chatModalOpen} 
        onClose={() => setChatModalOpen(false)}
        fullScreen
        sx={{ '& .MuiDialog-paper': { bgcolor: '#1e293b', color: '#f8fafc' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>실시간 1:1 고객 채팅</Typography>
          <IconButton onClick={() => setChatModalOpen(false)} sx={{ color: '#f8fafc' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e293b' }}>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <OwnerChatPanel />
          </Box>
        </DialogContent>
      </Dialog>

      {/* AI 경영 컨설턴트 모달 */}
      <Dialog 
        open={aiModalOpen} 
        onClose={() => setAiModalOpen(false)}
        fullScreen
        sx={{ '& .MuiDialog-paper': { bgcolor: '#1e293b', color: '#f8fafc' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>AI 경영 컨설턴트</Typography>
          <IconButton onClick={() => setAiModalOpen(false)} sx={{ color: '#f8fafc' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e293b' }}>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <AIAnalyzer />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
