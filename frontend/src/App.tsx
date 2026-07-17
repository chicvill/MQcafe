import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Box, Typography, Button, IconButton, CircularProgress } from '@mui/material';
import { QrCodeScanner, AdminPanelSettings, Menu } from '@mui/icons-material';

import { useAppContext } from './contexts/AppContext';
import { useUserContext } from './contexts/UserContext';
import { useChatContext } from './contexts/ChatContext';
import { useAppSync } from './hooks/useAppSync';

// Lazy loading main views
const CustomerMain = React.lazy(() => import('./components/customer/CustomerMain'));
const AdminMain = React.lazy(() => import('./components/admin/AdminMain'));
const OwnerMain = React.lazy(() => import('./components/owner/OwnerMain'));

import SeatMapModal from './components/customer/SeatMapModal';
import PaymentModal from './components/customer/PaymentModal';
import StoreSelector from './components/customer/StoreSelector';
import QRPoster from './pages/QRPoster';

import { API_URL } from './utils/constants';

function App() {
  const { mode, setMode, stores, setStores, storeId, ownerId, setSeats, setOpenPayAppModal, payAppDetails, setPayAppLoading, setOpenDrawer, setOwnerDrawerOpen, setCustomerDrawerOpen, setAdminDrawerOpen, setIsExtensionMode, terminalConnected, setPayStep, setCurrentRequestId, setStoreId } = useAppContext();
  const { activeSession, setActiveSession } = useUserContext();
  const { setChatMessages } = useChatContext();
  
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('ko-KR'));
  const pendingPayRef = useRef<{ requestId: string; onApprove: () => void } | null>(null);

  const activeSessionRef = useRef(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ko-KR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Hooks (MQTT, WebSockets)
  const { ws, mqttClientRef } = useAppSync(fetchSeats, pendingPayRef);

  // URL 동기화 (새로고침 없이 주소창 업데이트)
  useEffect(() => {
    const newPath = mode === 'admin' ? '/' : `/${mode}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath + window.location.search);
    }
  }, [mode]);

  // 결제 완료 후 결제 대기 상태 초기화
  useEffect(() => {
    if (mode === 'customer') {
      setPayStep('select');
      setCurrentRequestId(null);
      if (pendingPayRef.current) pendingPayRef.current = null;
    }
  }, [mode, setPayStep, setCurrentRequestId]);

  // 매장 목록 조회 (Prototype: 항상 모든 매장을 조회하여 테스트 가능하도록 함)
  async function fetchStores() {
    try {
      const url = (mode === 'owner' && ownerId) ? `${API_URL}/stores?owner_id=${ownerId}` : `${API_URL}/stores`;
      const res = await fetch(url);
      const data = await res.json();
      const formattedStores = (data.stores || []).map((store: any) => {
        const cleanName = store.name.replace('스터디카페 MQnet ', '').replace('MQcafe ', '');
        return {
          ...store,
          name: `MQcafe ${cleanName}`
        };
      });
      setStores(formattedStores);
      if (formattedStores.length > 0) {
        const storeExists = formattedStores.some((s: any) => s.id === storeId);
        if (!storeId || !storeExists) {
          setStoreId(formattedStores[0].id);
        }
      } else {
        setStoreId('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchStores();
  }, [ownerId, mode]);

  // 좌석 상태 조회
  async function fetchSeats() {
    if (!storeId) return;
    try {
      const res = await fetch(`${API_URL}/seats?store_id=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setSeats(data.seats);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchSeats();
  }, [storeId]);

  // Sync Hooks (MQTT, WebSockets)
  useAppSync(fetchSeats, pendingPayRef);

  // 결제 승인 후 서버 체크인 처리 (공통)
  const processCheckIn = async () => {
    if (!payAppDetails) return;
    setPayStep('done');
    try {
      if (payAppDetails.isExtension) {
        // 연장 결제
        const res = await fetch(`${API_URL}/session/extend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: activeSessionRef.current.session_id,
            extend_minutes: payAppDetails.durationMinutes
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setActiveSession({
            ...activeSessionRef.current,
            metadata: {
              ...activeSessionRef.current.metadata,
              scheduled_exit_time: data.new_exit_time
            }
          });
          setOpenDrawer(false);
          setIsExtensionMode(false);
          setOpenPayAppModal(false);
          setPayStep('select');
          alert('연장 결제가 완료되었습니다.');
        } else {
          alert(data.detail || '연장 처리에 실패했습니다.');
          setPayStep('select');
        }
      } else {
        // 신규 결제
        const res = await fetch(`${API_URL}/session/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            table_id: payAppDetails.tableId,
            user_name: payAppDetails.userName,
            phone_number: payAppDetails.phoneNumber,
            password: payAppDetails.password,
            jumin: payAppDetails.jumin,
            ticket_type: payAppDetails.ticketType,
            duration_minutes: payAppDetails.durationMinutes,
            amount: payAppDetails.amount,
            use_locker: payAppDetails.useLocker,
            scheduled_entry_time: payAppDetails.scheduledEntryTime,
            scheduled_exit_time: payAppDetails.scheduledExitTime,
            nicepay_tid: payAppDetails.nicepayTid ?? null,
            nicepay_order_id: payAppDetails.nicepayOrderId ?? null,
            pay_method: payAppDetails.payMethod ?? 'card',
          })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setActiveSession({
            session_id: data.session_id,
            table_id: payAppDetails.tableId,
            status: 'reserved',
            remaining_time_minutes: payAppDetails.durationMinutes,
            total_duration_minutes: payAppDetails.durationMinutes,
            checkin_time: new Date().toISOString(),
            metadata: {
              user_name: payAppDetails.userName,
              phone_number: payAppDetails.phoneNumber,
              ticket_type: payAppDetails.ticketType,
              scheduled_exit_time: payAppDetails.scheduledExitTime,
              access_pin: data.access_pin,
              locker_id: data.locker_id || null,
              locker_end_time: data.locker_end_time || null,
            }
          });
          localStorage.setItem('stcafe_user_name', payAppDetails.userName);
          localStorage.setItem('stcafe_phone_number', payAppDetails.phoneNumber);
          setOpenDrawer(false);
          setIsExtensionMode(false);
          setOpenPayAppModal(false);
          setPayStep('select');
          alert(`✅ 결제 완료!\n입장 시간이 5분 이내로 [입장]을 해주세요.\n🔑 PIN 번호: ${data.access_pin}`);
        } else {
          alert(data.detail || '결제 처리 중 오류가 발생했습니다.');
          setPayStep('select');
        }
      }
    } catch (err) {
      console.error(err);
      alert('결제 처리 서버 통신 실패');
      setPayStep('select');
    } finally {
      setPayAppLoading(false);
    }
  };

  const handlePayAppConfirmPayment = async () => {
    if (!payAppDetails) return;
    setPayAppLoading(true);
    setPayStep('waiting');

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCurrentRequestId(requestId);

    if (terminalConnected && mqttClientRef.current) {
      const payReq = {
        action: 'pay_request',
        storeId,
        requestId,
        amount: payAppDetails.amount,
        method: payAppDetails.payMethod || 'card',
        itemName: payAppDetails.itemName,
      };
      mqttClientRef.current.publish(
        `terminal/${storeId}/pay/request`,
        JSON.stringify(payReq),
        { qos: 1 }
      );
      pendingPayRef.current = { requestId, onApprove: processCheckIn };
      setTimeout(() => {
        if (pendingPayRef.current?.requestId === requestId) {
          if (mqttClientRef.current) {
            const cancelReq = { action: 'pay_cancel', storeId, requestId };
            mqttClientRef.current.publish(`terminal/${storeId}/pay/cancel`, JSON.stringify(cancelReq), { qos: 1 });
          }
          pendingPayRef.current = null;
          alert('단말기 결제 응답 시간 초과. 다시 시도해 주세요.');
          setPayAppLoading(false);
          setPayStep('select');
        }
      }, 60000);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await processCheckIn();
    }
  };

  const handleSendCustomerMessage = (e: React.FormEvent, msgText: string) => {
    e.preventDefault();
    if (!msgText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    ws.send(JSON.stringify({ text: msgText }));
    
    const newMsg = {
      sender: 'customer',
      text: msgText,
      timestamp: new Date().toISOString()
    };
    setChatMessages((prev: any[]) => [...prev, newMsg]);
  };

  if (mode === 'qr_poster') {
    return <QRPoster />;
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#f1f5f9' }}>
      <Box sx={{ 
        display: 'flex', flexDirection: 'column', gap: 1,
        p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* 첫 번째 줄: 로고 및 지점명 (중앙 정렬) */}
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, color: '#0f172a', textAlign: 'center' }}>
          MQcafe : <span style={{ color: '#10b981' }}>{stores.find(s => s.id === storeId)?.name?.replace('MQcafe ', '') || '운정 산내점'}</span>
        </Typography>

        {/* 두 번째 줄: 좌측(햄버거, 본사 관리자), 우측(모드 버튼들, 일시) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* 좌측: 햄버거 & 모든 모드 버튼들 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {(mode === 'owner' || mode === 'customer' || mode === 'admin') && (
              <IconButton 
                onClick={() => {
                  if (mode === 'owner') setOwnerDrawerOpen(true);
                  else if (mode === 'customer') setCustomerDrawerOpen(true);
                  else if (mode === 'admin') setAdminDrawerOpen(true);
                }} 
                sx={{ color: '#475569', p: 0 }}
              >
                <Menu fontSize="large" />
              </IconButton>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {mode === 'admin' && (
                <Button 
                  variant="contained" 
                  color="secondary"
                  onClick={() => setMode('admin')}
                  sx={{ borderRadius: '20px', textTransform: 'none' }}
                  startIcon={<AdminPanelSettings />}
                >
                  본사 관리자
                </Button>
              )}

              {(mode === 'customer' || mode === 'admin') && (
                <Button 
                  variant={mode === 'customer' ? 'contained' : 'outlined'} 
                  color="success"
                  onClick={() => setMode('customer')}
                  sx={{ borderRadius: '20px', textTransform: 'none' }}
                  startIcon={<QrCodeScanner />}
                >
                  고객 모드
                </Button>
              )}

              {(mode === 'owner' || mode === 'admin') && (
                <Button 
                  variant={mode === 'owner' ? 'contained' : 'outlined'} 
                  color="primary"
                  onClick={() => setMode('owner')}
                  sx={{ borderRadius: '20px', textTransform: 'none' }}
                  startIcon={<AdminPanelSettings />}
                >
                  점주 모드
                </Button>
              )}
            </Box>
          </Box>

          {/* 우측: 현재 일시 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
              {currentTime}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}><CircularProgress /></Box>}>
        {mode === 'customer' && (
          <CustomerMain
            fetchSeats={fetchSeats}
            handleSendCustomerMessage={handleSendCustomerMessage}
          />
        )}

        {mode === 'admin' && (
          <AdminMain />
        )}

        {mode === 'owner' && (
          <OwnerMain fetchStores={fetchStores} />
        )}
      </Suspense>


      <SeatMapModal fetchSeats={fetchSeats} />
      <StoreSelector />
      <PaymentModal handlePayAppConfirmPayment={handlePayAppConfirmPayment} />
    </Box>
  );
}

export default App;

