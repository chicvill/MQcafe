import { useState } from 'react';
import { Drawer, Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton } from '@mui/material';
import { Smartphone, EventSeat, Nfc, Chat, LocalParking, Close } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';

interface CustomerDrawerProps {
  handleSendCustomerMessage?: (e: any, msg: string) => void;
}

export default function CustomerDrawer({ handleSendCustomerMessage }: CustomerDrawerProps) {
  const { customerDrawerOpen, setCustomerDrawerOpen, setOpenSeatModal, setSeatMapMode } = useAppContext();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [carNumber, setCarNumber] = useState('');

  const handleClose = () => setCustomerDrawerOpen(false);
  const handleModalClose = () => setActiveModal(null);

  const handleParkingSubmit = () => {
    if (!carNumber.trim()) {
      alert('차량 번호를 입력해주세요.');
      return;
    }
    if (handleSendCustomerMessage) {
      handleSendCustomerMessage(null, `[주차 등록 요청] 차량번호: ${carNumber}`);
    }
    alert('주차 등록 요청이 점주님께 전송되었습니다.');
    setCarNumber('');
    handleModalClose();
  };

  return (
    <>
      <Drawer anchor="left" open={customerDrawerOpen} onClose={handleClose}>
        <Box sx={{ width: 280, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff' }}>
          <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a' }}>
              고객 서비스 메뉴
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              무인 솔루션 주요 기능
            </Typography>
          </Box>

          <List sx={{ pt: 2, flexGrow: 1 }}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setActiveModal('reservation'); handleClose(); }}>
                <ListItemIcon><Smartphone sx={{ color: '#3b82f6' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>모바일 예약 & 결제</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setActiveModal('seat'); handleClose(); }}>
                <ListItemIcon><EventSeat sx={{ color: '#10b981' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>실시간 좌석 선택</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setActiveModal('nfc'); handleClose(); }}>
                <ListItemIcon><Nfc sx={{ color: '#f59e0b' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>NFC 간편 출입</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setActiveModal('chat'); handleClose(); }}>
                <ListItemIcon><Chat sx={{ color: '#8b5cf6' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>점주 1:1 채팅</Typography>} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { setActiveModal('parking'); handleClose(); }}>
                <ListItemIcon><LocalParking sx={{ color: '#ef4444' }} /></ListItemIcon>
                <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: 14 }}>주차 등록 신청</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>

          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>MQcafe v2.0</Typography>
          </Box>
        </Box>
      </Drawer>

      {/* 모바일 예약 모달 */}
      <Dialog open={activeModal === 'reservation'} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          모바일 예약 & 결제
          <IconButton onClick={handleModalClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
            별도의 앱 설치 없이 간편하게 스터디카페 이용권을 예약하고 결제할 수 있습니다.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            - 시간권, 당일권, 기간권 등 다양한 요금제 지원<br/>
            - 네이버페이, 카카오페이 등 간편결제 완벽 호환
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={handleModalClose} sx={{ borderRadius: 2, fontWeight: 700 }}>확인</Button>
        </DialogActions>
      </Dialog>

      {/* 좌석 선택 모달 */}
      <Dialog open={activeModal === 'seat'} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          실시간 좌석 선택
          <IconButton onClick={handleModalClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
            현재 매장에 비어있는 좌석 현황을 2D 평면도로 한눈에 파악하고 원하는 자리를 미리 선점하세요.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            - 빅터존, 프로코프존 등 구역별 환경 확인<br/>
            - 실시간 이용 상태 연동
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button variant="outlined" color="success" onClick={() => { handleModalClose(); setSeatMapMode('reserve'); setOpenSeatModal(true); }} sx={{ borderRadius: 2, fontWeight: 700 }}>좌석 현황판 열기</Button>
          <Button variant="contained" onClick={handleModalClose} sx={{ borderRadius: 2, fontWeight: 700 }}>확인</Button>
        </DialogActions>
      </Dialog>

      {/* NFC 출입 모달 */}
      <Dialog open={activeModal === 'nfc'} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          NFC 간편 출입
          <IconButton onClick={handleModalClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
            결제 완료 후 발급되는 디지털 NFC 카드를 스마트폰 지갑에 등록하여, 터치만으로 출입문을 열 수 있습니다.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            - 영수증 분실 걱정 없는 스마트 키<br/>
            - 애플지갑 / 삼성월렛 연동 지원
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button variant="outlined" color="warning" onClick={() => { alert('NFC 출입증(스마트키) 발급은 예약 및 결제가 완료된 이후 활성 세션 창에서 진행 가능합니다.'); handleModalClose(); }} sx={{ borderRadius: 2, fontWeight: 700 }}>NFC 발급 안내</Button>
          <Button variant="contained" onClick={handleModalClose} sx={{ borderRadius: 2, fontWeight: 700 }}>확인</Button>
        </DialogActions>
      </Dialog>

      {/* 채팅 모달 */}
      <Dialog open={activeModal === 'chat'} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          점주 1:1 실시간 채팅
          <IconButton onClick={handleModalClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
            스터디카페 이용 중 불편사항이나 온도 조절 요청, 기타 문의가 있으시다면 점주님과 실시간으로 대화하세요.
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            - 즉각적인 문제 해결<br/>
            - 무인 매장에서도 안심하고 이용 가능
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={handleModalClose} sx={{ borderRadius: 2, fontWeight: 700 }}>확인</Button>
        </DialogActions>
      </Dialog>

      {/* 주차 등록 모달 */}
      <Dialog open={activeModal === 'parking'} onClose={handleModalClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          주차 등록 신청
          <IconButton onClick={handleModalClose} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: '#475569', mb: 2, fontWeight: 700 }}>
            차량 번호를 입력하시면 점주님께 등록 요청 메시지가 전송됩니다.
          </Typography>
          <TextField 
            fullWidth 
            label="차량 번호 (예: 12가 3456)" 
            variant="outlined" 
            value={carNumber} 
            onChange={(e) => setCarNumber(e.target.value)} 
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleModalClose} sx={{ color: '#64748b', fontWeight: 700 }}>취소</Button>
          <Button variant="contained" onClick={handleParkingSubmit} sx={{ borderRadius: 2, fontWeight: 700 }}>신청하기</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
