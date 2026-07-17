import React, { useRef, useState } from 'react';
import { Box, Typography, Button, Container, Drawer, TextField, Divider, Paper } from '@mui/material';
import { useAppContext } from '../../contexts/AppContext';
import { useUserContext } from '../../contexts/UserContext';
import ActiveSession from './ActiveSession';
import TicketSelector from './TicketSelector';
import LoginRegistration from './LoginRegistration';
import { STORES_DETAILS, API_URL } from '../../utils/constants';

// 날짜가 요일 문자열(일~토) 중 무엇인지 반환하는 헬퍼
const getDayName = (dateStr: string) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
};

export default function CustomerMain({ 
  fetchSeats,
  handleSendCustomerMessage
}: any) {
  const { openDrawer, setOpenDrawer, isExtensionMode, setIsExtensionMode, storeId, setOpenSeatModal, setSeatMapMode, setPayAppDetails, setPayStep, setOpenPayAppModal, setCurrentRequestId, payMethod, seats, stores } = useAppContext();
  const { activeSession, setActiveSession, userName, setUserName, phoneNumber, setPhoneNumber, password, setPassword, jumin, setJumin, tableId, getCalculatedPrice, entryDateTime, exitDateTime, ticketCategory, selectedTimeHours, selectedDayDays, periodEndDate, setPinCode, useLocker } = useUserContext();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const juminInputRef = useRef<HTMLInputElement>(null);

  const handleJuminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const inputType = (e.nativeEvent as any).inputType;

    if (inputType === 'deleteContentBackward') {
      let digitsOnly = val.replace(/[^0-9]/g, '');
      if (jumin.endsWith('- ******') && digitsOnly.length === 6) {
          digitsOnly = digitsOnly.slice(0, 5);
          setJumin(digitsOnly);
          return;
      }
      if (jumin.length === 14 && !jumin.endsWith('- ******') && digitsOnly.length === 7) {
          digitsOnly = digitsOnly.slice(0, 6);
          setJumin(`${digitsOnly}- ******`);
          setTimeout(() => {
             if (juminInputRef.current) {
                juminInputRef.current.setSelectionRange(8, 8);
             }
          }, 0);
          return;
      }
    }
    
    const digitsOnly = val.replace(/[^0-9]/g, '');

    if (digitsOnly.length >= 7) {
      const first6 = digitsOnly.slice(0, 6);
      const gender = digitsOnly.slice(6, 7);
      setJumin(`${first6}-${gender}******`);
      return;
    } else if (digitsOnly.length === 6) {
      setJumin(`${digitsOnly}- ******`);
      setTimeout(() => {
        if (juminInputRef.current) {
          juminInputRef.current.setSelectionRange(8, 8);
        }
      }, 0);
      return;
    } else {
      setJumin(digitsOnly);
      return;
    }
  };

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
    setPhoneNumber(formatted);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let cleanJumin = '';
    
    if (!isExtensionMode) {
      if (!tableId) {
        alert('좌석 및 사물함을 먼저 선택해 주세요.');
        return;
      }
      if (!userName || !phoneNumber || !password || !jumin) {
        alert('이름, 전화번호, 비밀번호, 주민등록번호를 모두 입력해 주세요.');
        return;
      }

      cleanJumin = jumin.replace(/\*/g, '').trim();
      const juminRegex = /^\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-[1-4]$/;
      if (!juminRegex.test(cleanJumin)) {
        alert('올바른 주민등록번호 형식(YYMMDD-G)이 아닙니다.');
        return;
      }

      const front = cleanJumin.split('-')[0];
      const back = cleanJumin.split('-')[1];
      const yearShort = parseInt(front.substring(0, 2), 10);
      const genderDigit = parseInt(back, 10);
      const birthYear = (genderDigit === 1 || genderDigit === 2) ? 1900 + yearShort : 2000 + yearShort;
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;

      if (age < 16) {
        alert(`본 스터디 카페는 만 16세 이상만 이용 가능합니다.\n(현재 나이: ${age}세)`);
        return;
      }
    }

    const start = new Date(entryDateTime);
    const selectedSeat = seats.find(s => s.id === tableId);
    if (selectedSeat && selectedSeat.is_occupied && selectedSeat.metadata?.scheduled_exit_time) {
      const minEntryDt = new Date(selectedSeat.metadata.scheduled_exit_time);
      minEntryDt.setMinutes(minEntryDt.getMinutes() + 10);
      if (start < minEntryDt) {
        alert(`선택하신 좌석은 현재 사용 중입니다.\n이전 사용자 종료 10분 후인\n[${minEntryDt.toLocaleString('ko-KR')}]\n이후부터 예약이 가능합니다.`);
        return;
      }
    }

    const end = new Date(exitDateTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) {
      alert('퇴실 예정일시는 입장 예정일시보다 나중이어야 합니다.');
      return;
    }

    let finalDurationMinutes = Math.max(0, Math.floor(diffMs / 60000));
    let finalAmount = getCalculatedPrice();
    const originalAmount = finalAmount;

    // 이벤트 규칙 (Event Engine) 평가 로직
    const currentStore = stores.find((s: any) => s.id === storeId);
    const eventRules = currentStore?.metadata?.event_rules || [];
    const eventPolicy = currentStore?.metadata?.event_policy || 'max_benefit';
    
    let appliedEvents: string[] = [];
    let totalDiscountAmount = 0;
    let totalBonusMinutes = 0;

    // 1. 적용 가능한 규칙 필터링
    const activeTime = new Date().toTimeString().substring(0, 5); // "HH:MM"
    const activeDay = getDayName(start.toISOString());

    const validRules = eventRules.filter((r: any) => {
      if (!r.is_active) return false;
      
      const { time_range_start, time_range_end, days_of_week, ticket_type, min_duration_hours } = r.conditions;
      
      // 시간 범위 체크
      if (time_range_start && time_range_end) {
        if (activeTime < time_range_start || activeTime > time_range_end) return false;
      }
      
      // 요일 체크
      if (days_of_week && days_of_week.length > 0) {
        if (!days_of_week.includes(activeDay)) return false;
      }
      
      // 권종 체크
      let currentTicketName = ticketCategory === 'time' ? '시간권' : (ticketCategory === 'day' ? '당일권' : '기간권');
      if (ticket_type && !currentTicketName.includes(ticket_type)) return false;
      
      // 최소 시간 체크
      if (min_duration_hours) {
        if ((finalDurationMinutes / 60) < min_duration_hours) return false;
      }
      
      return true;
    });

    // 2. 할인 및 보너스 계산 (정책 적용)
    if (validRules.length > 0) {
      if (eventPolicy === 'overlap') {
        // 중복 허용: 모두 합산
        validRules.forEach((r: any) => {
          appliedEvents.push(r.name);
          let discount = 0;
          if (r.effects.discount_amount) discount += r.effects.discount_amount;
          if (r.effects.discount_percent) discount += (originalAmount * (r.effects.discount_percent / 100));
          totalDiscountAmount += discount;
          if (r.effects.bonus_minutes) totalBonusMinutes += r.effects.bonus_minutes;
        });
      } else {
        // 최대 혜택 우선: 할인액이 가장 큰 규칙 하나만 적용 (할인액이 0이라면 보너스 시간이 가장 긴 것)
        let bestRule = validRules[0];
        let maxBenefit = 0;
        
        validRules.forEach((r: any) => {
          let discount = 0;
          if (r.effects.discount_amount) discount += r.effects.discount_amount;
          if (r.effects.discount_percent) discount += (originalAmount * (r.effects.discount_percent / 100));
          let benefitScore = discount + (r.effects.bonus_minutes * 10); // 임의의 가중치
          
          if (benefitScore > maxBenefit) {
            maxBenefit = benefitScore;
            bestRule = r;
          }
        });
        
        appliedEvents.push(bestRule.name);
        if (bestRule.effects.discount_amount) totalDiscountAmount += bestRule.effects.discount_amount;
        if (bestRule.effects.discount_percent) totalDiscountAmount += (originalAmount * (bestRule.effects.discount_percent / 100));
        if (bestRule.effects.bonus_minutes) totalBonusMinutes += bestRule.effects.bonus_minutes;
      }
      
      finalAmount = Math.max(0, originalAmount - totalDiscountAmount);
      finalDurationMinutes += totalBonusMinutes;
      // 종료 시간 연장
      if (totalBonusMinutes > 0) {
        end.setMinutes(end.getMinutes() + totalBonusMinutes);
      }
    }

    let ticketName = '자유석';
    if (ticketCategory === 'time') ticketName = `${selectedTimeHours}시간 시간권`;
    else if (ticketCategory === 'day') ticketName = `${selectedDayDays}일 당일권`;
    else if (ticketCategory === 'period') ticketName = `기간권 (종료일: ${periodEndDate})`;

    const storeName = STORES_DETAILS[storeId]?.name || 'MQcafe 통합 관리';
    const itemName = `${storeName} - ${ticketName} (${tableId.replace('seat-', '')}번 좌석)`;

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCurrentRequestId(requestId);

    setPayAppDetails({
      isExtension: isExtensionMode,
      itemName,
      amount: finalAmount,
      originalAmount,
      appliedEvents,
      totalDiscountAmount,
      totalBonusMinutes,
      userName,
      phoneNumber,
      password,
      jumin: cleanJumin,
      payMethod,
      tableId,
      ticketType: ticketCategory,
      durationMinutes: finalDurationMinutes,
      scheduledEntryTime: start.toISOString(),
      scheduledExitTime: end.toISOString(),
      useLocker
    });
    setPayStep('select');
    setOpenPayAppModal(true);
  };

  const handleEntry = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`${API_URL}/session/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveSession({
          ...activeSession,
          status: 'active'
        });
        alert(data.message);
      } else {
        alert(data.detail || '입실 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 실패');
    }
  };

  const handleRestoreSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneNumber || !password) {
      alert('전화번호와 비밀번호를 모두 입력해 주십시오.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/session/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, password: password })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveSession(data.session);
        setPinCode(data.session.metadata?.access_pin || '');
        setOpenDrawer(false);
        if (data.session.metadata?.user_name) {
            setUserName(data.session.metadata.user_name);
            localStorage.setItem('stcafe_user_name', data.session.metadata.user_name);
        }
        localStorage.setItem('stcafe_phone_number', phoneNumber);
        alert('이용 정보 복구에 성공했습니다.');
      } else {
        alert('조회된 이용 정보가 없습니다. 회원가입 화면으로 이동합니다.');
        setIsLoginMode(false);
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 실패');
    }
  };

  const handleOutingToggle = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`${API_URL}/session/outing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveSession({
          ...activeSession,
          status: data.session_status
        });
        alert(data.message);
      } else {
        alert(data.detail || '외출/복귀 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 실패');
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession) return;
    if (!window.confirm('정말로 퇴실하시겠습니까? 남은 이용권 시간은 소멸됩니다.')) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${API_URL}/session/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveSession(null);
        setPinCode('');
        alert('퇴실 처리가 정상 완료되었습니다. 이용해 주셔서 감사합니다.');
      } else {
        alert(data.detail || '퇴실 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 실패');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <Container maxWidth="xs" sx={{ px: 0 }}>
        {activeSession ? (
          <ActiveSession 
            handleEntry={handleEntry}
            handleOutingToggle={handleOutingToggle}
            handleCheckOut={handleCheckOut}
            checkoutLoading={checkoutLoading}
            fetchSeats={fetchSeats}
            handleSendCustomerMessage={handleSendCustomerMessage}
          />
        ) : (
          <LoginRegistration
            isLoginMode={isLoginMode}
            setIsLoginMode={setIsLoginMode}
            isVerified={isVerified}
            setIsVerified={setIsVerified}
            handleRestoreSession={handleRestoreSession}
            handlePhoneChange={handlePhoneChange}
            handleSendCustomerMessage={handleSendCustomerMessage}
          />
        )}
      </Container>

      <Drawer
        anchor="left"
        open={openDrawer}
        onClose={() => {
          setOpenDrawer(false);
          setIsExtensionMode(false);
        }}
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.3)' } }
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: '384px',
            maxWidth: '90vw',
            height: '100dvh',
            maxHeight: '100dvh',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            bgcolor: '#ffffff',
            color: '#0f172a',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#10b981' }}>{isExtensionMode ? '이용 시간 연장' : '메뉴 및 이용 등록'}</Typography>
          <Button onClick={() => {
            setOpenDrawer(false);
            setIsExtensionMode(false);
          }} size="small" sx={{ fontWeight: 800, color: '#64748b' }}>닫기</Button>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3.5, pr: 0.5, pb: 8 }}>
          <Box component="form" onSubmit={handleCheckIn} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
            
            {!isExtensionMode && (
              <>
                {/* 1. 개인정보 */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#475569', fontWeight: 900 }}>1. 개인정보 입력</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="이름"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    sx={{ mb: 1.2, input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="tel"
                    placeholder="휴대폰 번호 (010-XXXX-XXXX)"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    slotProps={{ input: { inputMode: 'numeric' } }}
                    sx={{ mb: 1.2, input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    placeholder="비밀번호 (이용자 본인확인용)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    sx={{ mb: 1.2, input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="tel"
                    placeholder="주민번호 앞6자리-뒷1자리 (예: 090507-3)"
                    value={jumin}
                    onChange={handleJuminChange}
                    inputRef={juminInputRef}
                    slotProps={{ input: { inputMode: 'numeric' } }}
                    sx={{ mb: 1.5, input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
                  />
                  <Button
                    type="button"
                    variant="outlined"
                    color="success"
                    fullWidth
                    onClick={handleRestoreSession}
                    sx={{ borderRadius: 2, fontWeight: 900, textTransform: 'none', fontSize: 13, py: 1 }}
                  >
                    내 기존 이용 정보 불러오기 (복구)
                  </Button>
                </Box>

                <Divider />

                {/* 2. 매장선택 (QR 접속으로 고정) */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#475569', fontWeight: 900 }}>2. 이용 매장 정보</Typography>

                  {(() => {
                    const selStore = STORES_DETAILS[storeId];
                    if (!selStore) return null;
                    return (
                      <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#10b981', fontWeight: 900, mb: 1, fontSize: 14 }}>
                          🏪 매장명: {selStore.name}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontWeight: 800, mb: 0.5 }}>
                          📍 주소: {selStore.address}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontWeight: 800, mb: 0.5 }}>
                          📞 대표번호: {selStore.phone}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontWeight: 800 }}>
                          🎫 잔여석: 자유석 {selStore.seats.free}
                        </Typography>
                      </Paper>
                    );
                  })()}
                </Box>

                <Divider />

                {/* 3. 좌석 선택 */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#475569', fontWeight: 900 }}>3. 좌석 선택</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="우측 버튼 클릭"
                      value={tableId ? `${tableId.replace('seat-', '')}번 좌석` : ''}
                      sx={{ input: { color: '#0f172a', fontWeight: 700, fontSize: 12 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
                      slotProps={{ input: { readOnly: true } }}
                    />
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => {
                        setSeatMapMode('reserve');
                        fetchSeats();
                        setOpenSeatModal(true);
                      }}
                      sx={{ whiteSpace: 'nowrap', borderRadius: 2, fontWeight: 900, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                    >
                      선택
                    </Button>
                  </Box>
                </Box>

                <Divider />
              </>
            )}

            {/* 4. 요금제 및 일시 선택 */}
            {tableId ? (
              <TicketSelector />
            ) : (
              <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 700 }}>
                  좌석을 먼저 선택하시면 요금제가 표시됩니다.
                </Typography>
              </Box>
            )}

            <Divider />

            {/* 5. 요금 계산 및 제출 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #10b981', borderRadius: 3, textAlign: 'center' }}>
                <Typography variant="caption" color="#475569" sx={{ fontWeight: 800, display: 'block', mb: 0.5 }}>
                  설정 기간: <strong>{Math.ceil((new Date(exitDateTime).getTime() - new Date(entryDateTime).getTime()) / 60000)}분</strong>
                </Typography>
                <Typography variant="subtitle1" color="#10b981" sx={{ fontWeight: 900 }}>
                  {getCalculatedPrice().toLocaleString()}원
                </Typography>
              </Paper>

              <Button
                type="submit"
                variant="contained"
                color="success"
                fullWidth
                sx={{ py: 1.2, borderRadius: 2.5, fontWeight: 900, fontSize: 15, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
              >
                {isExtensionMode ? '연장 결제하기' : '결제하기'}
              </Button>
            </Box>

          </Box>
        </Box>
      </Drawer>
    </>
  );
}
