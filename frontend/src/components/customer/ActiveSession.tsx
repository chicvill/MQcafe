import { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent, LinearProgress, Chip, Paper, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Timer, MeetingRoom, DoorBack, Send, SwapHoriz, ContactlessOutlined, InfoOutlined, LockOutlined, DeleteOutlined } from '@mui/icons-material';
import { useUserContext } from '../../contexts/UserContext';
import { useChatContext } from '../../contexts/ChatContext';
import { useAppContext } from '../../contexts/AppContext';
import { formatMsgTime, API_URL, STORES_DETAILS } from '../../utils/constants';
import LockerMapModal from './LockerMapModal';

export default function ActiveSession({ handleEntry, handleOutingToggle, handleCheckOut, checkoutLoading, fetchSeats, handleSendCustomerMessage }: any) {
  const { activeSession, setActiveSession, pinCode } = useUserContext();
  const { chatMessages, setChatMessages, customerMessageInput, setCustomerMessageInput } = useChatContext();
  const { setOpenSeatModal, setSeatMapMode, setOpenDrawer, setIsExtensionMode } = useAppContext();
  
  const [openNfcDialog, setOpenNfcDialog] = useState(false);
  const [openLockerModal, setOpenLockerModal] = useState(false);
  
  // NFC Test Simulation State
  const [openNfcSimDialog, setOpenNfcSimDialog] = useState(false);
  const [nfcSimResult, setNfcSimResult] = useState<any>(null);

  useEffect(() => {
    const handleNfcScanEvent = (e: any) => {
      if (e.detail) {
        setNfcSimResult(e.detail);
        setOpenNfcSimDialog(true);
        if (e.detail.status === 'success') {
          setActiveSession((prev: any) => prev ? { ...prev, status: 'active' } : prev);
        }
      }
    };
    window.addEventListener('nfc_scan_event', handleNfcScanEvent);
    return () => window.removeEventListener('nfc_scan_event', handleNfcScanEvent);
  }, [setActiveSession]);

  const handleMoveSeatClick = () => {
    setSeatMapMode('move');
    fetchSeats();
    setOpenSeatModal(true);
  };

  const confirmNfcPairing = async () => {
    try {
      setOpenNfcDialog(false);
      const res = await fetch(`${API_URL}/nfc/request_registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: activeSession.store_id || 'ST001',
          user_name: activeSession.metadata?.user_name,
          phone_number: activeSession.metadata?.phone_number
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(data.message);
      } else {
        alert(data.message || '카드 등록 요청에 실패했습니다.');
      }
    } catch (err) {
      alert('서버와의 통신에 실패했습니다.');
    }
  };

  const handleClearMessages = async () => {
    if (!activeSession) return;
    if (!window.confirm("채팅 기록을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/chat/${activeSession.session_id}`, { method: 'DELETE' });
      if (res.ok) {
        setChatMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!activeSession) return null;

  const formatRemaining = (minutes: number) => {
    if (minutes <= 0) return '0분';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  const entryTime = activeSession.metadata?.scheduled_entry_time;
  const exitTime = activeSession.metadata?.scheduled_exit_time;
  const entryDiff = entryTime ? Math.abs(Date.now() - new Date(entryTime).getTime()) / 60000 : 999;
  const exitDiff = exitTime ? Math.abs(Date.now() - new Date(exitTime).getTime()) / 60000 : 999;
  const canOpen = entryDiff <= 5.0 || exitDiff <= 5.0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card sx={{ bgcolor: '#ffffff', color: '#0f172a', borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
        <Box sx={{ bgcolor: '#1e293b', color: '#ffffff', p: 1.5, textAlign: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            MQcafe : {STORES_DETAILS[activeSession.store_id]?.name || '알 수 없는 매장'} - {activeSession.store_id}
          </Typography>
        </Box>
        <Box sx={{ 
          bgcolor: activeSession.status === 'reserved' ? '#eff6ff' : activeSession.status === 'outing' ? '#ffe8cc' : '#d1fae5', 
          p: 3, 
          textAlign: 'center', 
          color: activeSession.status === 'reserved' ? '#1d4ed8' : activeSession.status === 'outing' ? '#d97706' : '#059669' 
        }}>
          <Timer sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {activeSession.status === 'reserved' ? '입실 대기 (예약 완료)' : activeSession.status === 'outing' ? '외출 중' : '이용 중'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            배정 좌석: {activeSession.table_id?.replace('seat-', '')}번 좌석
          </Typography>
        </Box>
        
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 800 }}>이용권 종류</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {activeSession.metadata?.ticket_type === 'time' ? '시간권' : activeSession.metadata?.ticket_type === 'day' ? '당일권' : '기간권'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 800 }}>시작 일시</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {activeSession.metadata?.scheduled_entry_time ? new Date(activeSession.metadata.scheduled_entry_time).toLocaleString('ko-KR', { hour12: false }) : '-'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 800 }}>종료 일시</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {activeSession.metadata?.scheduled_exit_time ? new Date(activeSession.metadata.scheduled_exit_time).toLocaleString('ko-KR', { hour12: false }) : '-'}
              </Typography>
            </Box>
            
            {activeSession.status !== 'reserved' ? (
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 800 }}>잔여 시간</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#10b981' }}>
                    {formatRemaining(activeSession.remaining_time_minutes || 0)} 남음
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Number.isNaN(((activeSession.remaining_time_minutes || 0) / (activeSession.total_duration_minutes || activeSession.remaining_time_minutes || 1)) * 100) ? 0 : Math.max(0, Math.min(100, ((activeSession.remaining_time_minutes || 0) / (activeSession.total_duration_minutes || activeSession.remaining_time_minutes || 1)) * 100)) || 0} 
                  color={activeSession.status === 'outing' ? 'warning' : 'success'}
                  sx={{ height: 8, borderRadius: 4, bgcolor: '#f1f5f9' }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 800 }}>이용 시간</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {activeSession.total_duration_minutes || activeSession.remaining_time_minutes}분 (입실 대기)
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Chip 
              label={canOpen ? "✅ 출입문 열기 가능 시간대" : "⚠️ 출입 제어 중 (예약/종료 시간 전후 5분만 가능)"}
              color={canOpen ? "success" : "warning"}
              variant="outlined"
              sx={{ fontWeight: 800, fontSize: '11px', px: 1 }}
            />
          </Box>

          {pinCode && (
            <Paper sx={{ p: 2, bgcolor: '#f8fafc', border: '1px dashed #10b981', mb: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>출입문 키패드 비밀번호 (핸드폰 방전 시 사용)</Typography>
              <Typography variant="h5" color="#10b981" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: 4 }}>
                {pinCode}
              </Typography>
            </Paper>
          )}

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12 }}>
              <Button
                fullWidth
                variant="outlined"
                color="info"
                onClick={() => setOpenNfcDialog(true)}
                startIcon={<ContactlessOutlined />}
                sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, fontSize: 13, borderStyle: 'dashed' }}
              >
                출입용 카드 간편 연동하기
              </Button>
            </Grid>

            {activeSession.status === 'reserved' ? (
              <>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={handleEntry}
                    startIcon={<MeetingRoom />}
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontSize: 13 }}
                  >
                    출입문 열기
                  </Button>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={handleMoveSeatClick}
                    startIcon={<SwapHoriz />}
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: 13 }}
                  >
                    좌석이동
                  </Button>
                </Grid>
              </>
            ) : (
              <>
                  <Grid size={{ xs: 2.5 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color={activeSession.status === 'outing' ? 'success' : 'warning'}
                      onClick={handleOutingToggle}
                      startIcon={activeSession.status === 'outing' ? <DoorBack /> : <MeetingRoom />}
                      sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, px: 0.2, fontSize: 11, whiteSpace: 'nowrap', minWidth: 0 }}
                    >
                      {activeSession.status === 'outing' ? '복귀' : '외출'}
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 3.5 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      onClick={handleMoveSeatClick}
                      startIcon={<SwapHoriz />}
                      sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: 11, px: 0.5, whiteSpace: 'nowrap', minWidth: 0, letterSpacing: -0.5 }}
                    >
                      자리이동
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 3.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="info"
                      onClick={() => {
                        setIsExtensionMode(true);
                        setOpenDrawer(true);
                      }}
                      startIcon={<Timer />}
                      sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: 11, px: 0.5, whiteSpace: 'nowrap', minWidth: 0, letterSpacing: -0.5 }}
                    >
                      연장하기
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 2.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      onClick={handleCheckOut}
                      disabled={checkoutLoading}
                      startIcon={<DoorBack />}
                      sx={{ py: 1.5, borderRadius: 3, fontWeight: 700, px: 0.2, fontSize: 11, whiteSpace: 'nowrap', minWidth: 0 }}
                    >
                      퇴실
                    </Button>
                  </Grid>
                </>
            )}
            {activeSession.status !== 'reserved' && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748b', mt: 1 }}>
                  ※ 외출 중에도 회원권의 유효 시간은 동일하게 차감됩니다.
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* 사물함 섹션 */}
      {(activeSession.metadata?.ticket_type === 'day' || activeSession.metadata?.ticket_type === 'period') && activeSession.metadata?.use_locker && (
        <Card sx={{ bgcolor: '#ffffff', color: '#0f172a', borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
          <Box sx={{ bgcolor: '#f8fafc', p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlined sx={{ fontSize: 20, color: '#10b981' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>개인 사물함 (장기 이용자 전용)</Typography>
          </Box>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#64748b' }}>
                배정 상태
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800, color: activeSession.metadata?.locker_id ? '#10b981' : '#ef4444' }}>
                {activeSession.metadata?.locker_id ? `${activeSession.metadata.locker_id.replace('locker-', '')}번 사물함 사용 중` : '미배정'}
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant={activeSession.metadata?.locker_id ? "outlined" : "contained"}
              color="primary"
              onClick={() => setOpenLockerModal(true)}
              sx={{ py: 1.2, borderRadius: 2, fontWeight: 700, fontSize: 13 }}
            >
              {activeSession.metadata?.locker_id ? '사물함 이동하기' : '사물함 배정받기'}
            </Button>
            
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#ef4444', mt: 1, fontWeight: 700 }}>
              ※ 퇴실 이후에 남아있는 사유물은 분실 시 책임지지 않습니다.
            </Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ bgcolor: '#ffffff', color: '#0f172a', borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
        <Box sx={{ bgcolor: '#f8fafc', p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Send sx={{ fontSize: 20, color: '#10b981' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>실시간 1:1 관리자 문의</Typography>
          </Box>
          <IconButton size="small" color="error" onClick={handleClearMessages} title="채팅 내역 초기화">
            <DeleteOutlined fontSize="small" />
          </IconButton>
        </Box>
        <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '280px' }}>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, pr: 0.5 }}>
            {chatMessages.length === 0 ? (
              <Box sx={{ my: 'auto', textAlign: 'center', color: '#64748b' }}>
                <Typography variant="caption" sx={{ display: 'block' }}>관리자에게 문의사항이 있다면 메시지를 보내보세요.</Typography>
                <Typography variant="caption" color="textSecondary">이용 중 실시간으로 답변을 드립니다.</Typography>
              </Box>
            ) : (
              chatMessages.map((msg, idx) => {
                const isMe = msg.sender === 'customer';
                const timeStr = formatMsgTime(msg.timestamp);
                return (
                  <Box 
                    key={idx} 
                    sx={{ 
                      display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-end', gap: 0.8, alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%'
                    }}
                  >
                    <Box 
                      sx={{ 
                        p: 1.2, borderRadius: 3, bgcolor: isMe ? '#334155' : '#0284c7',
                        color: '#ffffff', fontSize: 13, fontWeight: 500, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                        display: 'flex', flexDirection: 'column', gap: 1
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: 'inherit' }}>
                        {msg.text}
                      </Typography>
                      {!isMe && (msg.text.includes("이용 시간 연장을 원하시면") || msg.text.includes("연장 결제")) && (
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="small" 
                          onClick={() => {
                            setIsExtensionMode(true);
                            setOpenDrawer(true);
                          }}
                          sx={{ mt: 0.5, alignSelf: 'flex-start', fontWeight: 900, fontSize: 11, borderRadius: 2, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                        >
                          이용 연장 결제하기
                        </Button>
                      )}
                    </Box>
                    {timeStr && (
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 9, fontWeight: 700, userSelect: 'none', mb: 0.3 }}>
                        {timeStr}
                      </Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
          <form onSubmit={(e) => {
                handleSendCustomerMessage(e, customerMessageInput);
                setCustomerMessageInput('');
              }} style={{ display: 'flex', gap: '8px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="문의하실 내용을 입력해 주세요..."
              value={customerMessageInput}
              onChange={(e) => setCustomerMessageInput(e.target.value)}
              sx={{ input: { color: '#0f172a', fontSize: 13 }, bgcolor: '#f8fafc', borderRadius: 2 }}
            />
            <IconButton type="submit" color="success" sx={{ bgcolor: '#10b981', color: 'white', '&:hover': { bgcolor: '#059669' } }}>
              <Send sx={{ fontSize: 16 }} />
            </IconButton>
          </form>
        </CardContent>
      </Card>

      <Dialog open={openNfcDialog} onClose={() => setOpenNfcDialog(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#0f172a' }}>
          <ContactlessOutlined sx={{ color: '#3b82f6' }} /> 출입용 카드 간편 연동 안내
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          
          <Box sx={{ bgcolor: '#eff6ff', p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1d4ed8', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InfoOutlined fontSize="small" /> 기능의 필요성 (왜 등록하나요?)
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
              현재 앱을 통해서도 출입문 개방이 가능하지만, 카드를 등록해 두시면 훨씬 더 편리합니다.<br/>
              <b>- 빠르고 간편한 출입:</b> 핸드폰을 켜서 앱에 접속할 필요 없이 지갑 속 실물 카드 터치만으로 즉시 출입이 가능합니다.<br/>
              <b>- 안심 보안:</b> 등록 시 카드의 고유 식별 번호(UID)만 사용하며, <b>절대 카드의 결제 정보는 읽거나 저장되지 않습니다.</b>
            </Typography>
          </Box>

          <Box sx={{ border: '1px solid #e2e8f0', p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
              등록 및 사용 방법
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.6 }}>
              1. 하단의 <b>[연동 시작]</b> 버튼을 누릅니다.<br/>
              2. <b>60초 내에</b> 매장 입구 리더기(단말기) 화면 뒷면에 소지하신 실물 카드를 한 번 태그합니다.<br/>
              3. 단말기에서 '연동 성공' 알림이 뜨면 완료입니다. 다음부터는 카드를 대기만 하면 문이 열립니다!
            </Typography>
          </Box>
          
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => setOpenNfcDialog(false)} sx={{ flex: 1, borderRadius: 2, py: 1.2, fontWeight: 700 }}>
            사용 않음 (취소)
          </Button>
          <Button variant="contained" color="primary" onClick={confirmNfcPairing} sx={{ flex: 1, borderRadius: 2, py: 1.2, fontWeight: 800 }}>
            연동 시작 (예)
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={openNfcSimDialog} onClose={() => setOpenNfcSimDialog(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 4, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#0f172a' }}>
          <ContactlessOutlined sx={{ color: '#8b5cf6' }} /> 출입문 제어 결과
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {nfcSimResult && (
            <Box sx={{ bgcolor: nfcSimResult.status === 'success' || nfcSimResult.status === 'registered_now' ? '#d1fae5' : '#fee2e2', p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: nfcSimResult.status === 'success' || nfcSimResult.status === 'registered_now' ? '#059669' : '#dc2626', mb: 1 }}>
                {nfcSimResult.status === 'success' || nfcSimResult.status === 'registered_now' ? '스캔 및 인증 성공' : `스캔 결과 (${nfcSimResult.status})`}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-line', color: '#0f172a', fontWeight: 700 }}>
                {nfcSimResult.message}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
          <Button variant="contained" color="primary" onClick={() => setOpenNfcSimDialog(false)} sx={{ flex: 1, borderRadius: 2, py: 1.2, fontWeight: 800 }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
      
      <LockerMapModal 
        open={openLockerModal} 
        onClose={() => setOpenLockerModal(false)} 
        storeId={activeSession.store_id || 'ST001'}
      />
    </Box>
  );
}

