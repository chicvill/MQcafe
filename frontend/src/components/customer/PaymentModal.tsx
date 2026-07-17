import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogContent,
  CircularProgress, Paper, Chip, Fade, Grow
} from '@mui/material';
import {
  CreditCard, PhoneAndroid, Bolt, CheckCircle,
  Wifi, WifiOff, Nfc, Contactless, OpenInNew, BugReport
} from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { NICEPAY_CLIENT_ID, NICEPAY_APPROVE_URL, API_URL } from '../../utils/constants';

// NicePay 전역 타입 선언
declare const AUTHNICE: {
  requestPay: (params: {
    clientId: string;
    method: string;
    orderId: string;
    amount: number;
    goodsName: string;
    returnUrl: string;
    mallReserved?: string;
    fnError?: (result: { errorMsg: string; errorCode: string }) => void;
  }) => void;
};

// ── 간편Pay 브랜드 설정 (주의: key는 AppContext selectedEasyPay 타입과 일치)
const EASY_PAY_OPTIONS = [
  { key: 'naver'   as const, label: 'N Pay',        color: '#03c75a', textColor: '#fff',    nicepayMethod: 'naverpayCard'   },
  { key: 'kakao'   as const, label: 'kakao pay',    color: '#fee500', textColor: '#191919', nicepayMethod: 'kakaopay'       },
  { key: 'samsung' as const, label: 'Samsung Pay',  color: '#034ea2', textColor: '#fff',    nicepayMethod: 'samsungpayCard' },
  { key: 'toss'    as const, label: 'toss pay',     color: '#0064ff', textColor: '#fff',    nicepayMethod: 'tosspay'        },
] as const;

// ── 결제 수단 정의 ────────────────────────────────────────────────────
const PAY_METHODS = [
  {
    key: 'card' as const,
    icon: <CreditCard sx={{ fontSize: 28 }} />,
    label: '신용 / 체크카드',
    desc: '모든 신용·체크카드 결제 (IC / 비접촉 / 온라인)',
    badge: 'IC · NFC · 온라인',
    nicepayMethod: 'card',
  },
  {
    key: 'appcard' as const,
    icon: <PhoneAndroid sx={{ fontSize: 28 }} />,
    label: '앱카드 (QR/바코드)',
    desc: '카드사 앱을 열어 QR 또는 바코드를 제시하세요',
    badge: 'QR · 바코드',
    nicepayMethod: 'appcard',
  },
  {
    key: 'easypay' as const,
    icon: <Bolt sx={{ fontSize: 28 }} />,
    label: '간편Pay',
    desc: '네이버·카카오·삼성·토스 페이를 선택하세요',
    badge: 'N · Kakao · Samsung · Toss',
    nicepayMethod: 'naverpay', // 기본값, 실제는 selectedEasyPay로 결정
  },
  {
    key: 'mock' as const,
    icon: <BugReport sx={{ fontSize: 28 }} />,
    label: '테스트용 모의 결제',
    desc: '실제 결제 없이 바로 승인되는 시뮬레이션 결제입니다',
    badge: '테스트 · 즉시 승인',
    nicepayMethod: 'simulation',
  },
];

export default function PaymentModal({
  handlePayAppConfirmPayment,
}: {
  handlePayAppConfirmPayment: () => void;
}) {
  const {
    openPayAppModal, setOpenPayAppModal,
    payAppLoading, setPayAppLoading,
    payAppDetails,
    payMethod, setPayMethod,
    selectedEasyPay, setSelectedEasyPay,
    terminalConnected,
    payStep, setPayStep,
    storeId,
    currentRequestId,
  } = useAppContext();

  const [pulse, setPulse] = useState(false);
  const [nicepayClientId, setNicepayClientId] = useState<string>('');

  // 백엔드로부터 NICEPAY_CLIENT_ID 조회
  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nicepay_client_id) {
          setNicepayClientId(data.nicepay_client_id);
        }
      })
      .catch((err) => {
        console.error('Failed to load NICEPAY_CLIENT_ID from backend:', err);
      });
  }, []);

  // 단말기 대기 중 펄스 애니메이션
  useEffect(() => {
    if (payStep !== 'waiting') { setPulse(false); return; }
    const id = setInterval(() => setPulse((p) => !p), 900);
    return () => clearInterval(id);
  }, [payStep]);

  const handleClose = () => {
    if (payAppLoading) return;
    setOpenPayAppModal(false);
    setPayStep('select');
  };

  // ── NicePay 결제창 호출 ──────────────────────────────────────────────
  const handleNicePayRequest = () => {
    if (!payAppDetails) return;

    // orderId: {storeId}_{requestId} 형식으로 백엔드 Webhook에서 storeId 파싱에 활용
    const orderId = `${storeId}_${currentRequestId || Date.now()}`;

    // NicePay 결제 수단 매핑
    let nicepayMethod = 'card';
    if (payMethod === 'appcard') nicepayMethod = 'appcard';
    else if (payMethod === 'easypay') {
      const ep = EASY_PAY_OPTIONS.find(e => e.key === selectedEasyPay);
      nicepayMethod = ep?.nicepayMethod ?? 'naverpay';
    }

    // NicePay JS SDK가 로드되지 않은 경우 → 시뮬레이션 폴백
    if (typeof AUTHNICE === 'undefined') {
      console.warn('[NicePay] SDK 미로드 — 시뮬레이션 모드로 실행');
      handlePayAppConfirmPayment();
      return;
    }

    setPayAppLoading(true);
    setPayStep('waiting');

    AUTHNICE.requestPay({
      clientId: nicepayClientId || NICEPAY_CLIENT_ID,
      method: nicepayMethod,
      orderId,
      amount: payAppDetails.amount,
      goodsName: payAppDetails.itemName,
      returnUrl: NICEPAY_APPROVE_URL,
      mallReserved: JSON.stringify({
        storeId,
        userName: payAppDetails.userName,
        phoneNumber: payAppDetails.phoneNumber,
        tableId: payAppDetails.tableId ?? '',
        ticketType: payAppDetails.ticketType ?? '',
        durationMinutes: payAppDetails.durationMinutes,
        scheduledEntryTime: payAppDetails.scheduledEntryTime,
        scheduledExitTime: payAppDetails.scheduledExitTime,
      }),
      fnError: (result) => {
        alert(`결제 오류: ${result.errorMsg} (${result.errorCode})`);
        setPayAppLoading(false);
        setPayStep('select');
      },
    });
  };

  // ── 결제 버튼 클릭 핸들러 ────────────────────────────────────────────
  const onPayClick = () => {
    // 단말기 연결 여부와 무관하게 NicePay 결제창 우선 사용
    // NicePay SDK 미로드 시 → 기존 MQTT 시뮬레이션 폴백
    if (payMethod === 'mock') {
      handlePayAppConfirmPayment();
    } else if (typeof AUTHNICE !== 'undefined') {
      handleNicePayRequest();
    } else {
      // 시뮬레이션 모드 (단말기 미연결 + SDK 미로드)
      handlePayAppConfirmPayment();
    }
  };

  const canProceed = payMethod !== 'easypay' || selectedEasyPay !== undefined;

  return (
    <Dialog
      open={openPayAppModal}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#0f172a',
            color: '#f8fafc',
            borderRadius: 4,
            border: '1.5px solid #1e293b',
            overflow: 'hidden',
            p: 0,
          },
        },
      }}
    >
      {/* ── 헤더 ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          px: 3, py: 2,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, fontSize: 15, display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <CreditCard sx={{ fontSize: 18 }} /> NicePay 결제
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700 }}>
            나이스페이먼츠 통합 결제 시스템
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          {/* 단말기 연결 상태 */}
          <Chip
            icon={
              terminalConnected
                ? <Wifi sx={{ fontSize: '14px !important', color: '#fff !important' }} />
                : <WifiOff sx={{ fontSize: '14px !important', color: '#475569 !important' }} />
            }
            label={terminalConnected ? '단말기 연결됨' : '시뮬레이션 모드'}
            size="small"
            sx={{
              bgcolor: terminalConnected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)',
              color: terminalConnected ? '#fff' : '#94a3b8',
              fontWeight: 800, fontSize: 10, height: 22,
              border: terminalConnected ? '1px solid rgba(255,255,255,0.4)' : '1px solid #334155',
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />
          <Button
            onClick={handleClose}
            disabled={payAppLoading}
            size="small"
            sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, minWidth: 0, p: 0, fontSize: 12 }}
          >
            닫기
          </Button>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>

        {/* ── 결제 금액 배너 ────────────────────────────────────────── */}
        <Box
          sx={{
            px: 3, py: 2,
            bgcolor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
              {payAppDetails?.itemName}
            </Typography>
            
            {/* 이벤트 혜택 표시 */}
            {(payAppDetails?.totalDiscountAmount > 0 || payAppDetails?.totalBonusMinutes > 0) && (
              <Box sx={{ mt: 0.5, mb: 0.5 }}>
                {payAppDetails.appliedEvents?.map((evt: string, i: number) => (
                  <Chip key={i} label={evt} size="small" sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 800, fontSize: 10, height: 20, mr: 0.5, border: '1px solid rgba(239,68,68,0.3)' }} />
                ))}
                {payAppDetails.totalDiscountAmount > 0 && (
                  <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 700, display: 'block', mt: 0.5 }}>
                    {payAppDetails.originalAmount?.toLocaleString()}원에서 -{payAppDetails.totalDiscountAmount.toLocaleString()}원 할인됨!
                  </Typography>
                )}
                {payAppDetails.totalBonusMinutes > 0 && (
                  <Typography variant="caption" sx={{ color: '#0ea5e9', fontWeight: 700, display: 'block' }}>
                    보너스 {payAppDetails.totalBonusMinutes}분 추가 제공!
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="h5" sx={{ fontWeight: 900, color: '#10b981', lineHeight: 1.2, mt: 0.3 }}>
              {payAppDetails?.amount?.toLocaleString()}
              <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: '#94a3b8', ml: 0.5 }}>원</Typography>
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>구매자</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: '#e2e8f0' }}>{payAppDetails?.userName}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>{payAppDetails?.phoneNumber}</Typography>
          </Box>
        </Box>

        {/* ── 단계 인디케이터 ──────────────────────────────────────── */}
        <Box sx={{ px: 3, py: 1.5, bgcolor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          {(['select', 'waiting', 'done'] as const).map((step, idx) => {
            const labels = ['수단 선택', '결제 진행', '승인 완료'];
            const isActive = payStep === step;
            const isDone = (
              (step === 'select' && (payStep === 'waiting' || payStep === 'done')) ||
              (step === 'waiting' && payStep === 'done')
            );
            return (
              <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isDone ? '#10b981' : isActive ? '#10b981' : '#1e293b',
                    border: isActive ? '2px solid #34d399' : isDone ? '2px solid #10b981' : '2px solid #334155',
                    transition: 'all 0.3s',
                  }}
                >
                  {isDone
                    ? <CheckCircle sx={{ fontSize: 13, color: '#fff' }} />
                    : <Typography sx={{ fontSize: 10, fontWeight: 900, color: isActive ? '#fff' : '#475569' }}>{idx + 1}</Typography>
                  }
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: isActive ? '#10b981' : isDone ? '#34d399' : '#475569', fontSize: 11 }}>
                  {labels[idx]}
                </Typography>
                {idx < 2 && <Box sx={{ width: 20, height: 1, bgcolor: isDone ? '#10b981' : '#334155', mx: 0.5 }} />}
              </Box>
            );
          })}
        </Box>

        {/* ══════════════════════════════════════════════════════════════
            STEP 1: 결제 수단 선택
        ══════════════════════════════════════════════════════════════ */}
        {payStep === 'select' && (
          <Fade in timeout={300}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

              {/* 결제 수단 카드 */}
              {PAY_METHODS.map((m) => (
                <Box key={m.key}>
                  <Paper
                    onClick={() => setPayMethod(m.key)}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      bgcolor: payMethod === m.key ? 'rgba(16,185,129,0.12)' : '#1e293b',
                      border: `1.5px solid ${payMethod === m.key ? '#10b981' : '#334155'}`,
                      borderRadius: 2.5,
                      display: 'flex', alignItems: 'center', gap: 2,
                      transition: 'all 0.2s',
                      '&:hover': { border: '1.5px solid #10b981', bgcolor: 'rgba(16,185,129,0.07)' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44, height: 44, borderRadius: 2,
                        bgcolor: payMethod === m.key ? '#10b981' : '#334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: payMethod === m.key ? '#fff' : '#64748b',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      {m.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: '#f1f5f9' }}>
                          {m.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ bgcolor: '#334155', color: '#94a3b8', px: 0.8, py: 0.2, borderRadius: 1, fontSize: 9, fontWeight: 700 }}
                        >
                          {m.badge}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                        {m.desc}
                      </Typography>
                    </Box>
                    {payMethod === m.key && (
                      <CheckCircle sx={{ color: '#10b981', fontSize: 20, flexShrink: 0 }} />
                    )}
                  </Paper>

                  {/* 간편Pay 서브 선택 */}
                  {m.key === 'easypay' && payMethod === 'easypay' && (
                    <Grow in timeout={250}>
                      <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap', pl: 1, pr: 0.5 }}>
                        {EASY_PAY_OPTIONS.map((ep) => (
                          <Button
                            key={ep.key}
                            onClick={() => setSelectedEasyPay(ep.key as any)}
                            size="small"
                            sx={{
                              flex: '1 1 calc(50% - 4px)',
                              py: 0.9,
                              bgcolor: selectedEasyPay === ep.key ? ep.color : '#1e293b',
                              color: selectedEasyPay === ep.key ? ep.textColor : '#64748b',
                              border: selectedEasyPay === ep.key
                                ? `2px solid ${ep.color}`
                                : '2px solid #334155',
                              borderRadius: 2,
                              fontWeight: 900, fontSize: 12,
                              textTransform: 'none',
                              transition: 'all 0.18s',
                              '&:hover': { bgcolor: ep.color, color: ep.textColor, opacity: 0.9 },
                            }}
                          >
                            {ep.label}
                          </Button>
                        ))}
                      </Box>
                    </Grow>
                  )}
                </Box>
              ))}

              {/* 시뮬레이션 모드 안내 (NicePay SDK 미로드 시) */}
              {typeof window !== 'undefined' && (window as any).AUTHNICE === undefined && (
                <Box
                  sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1,
                    p: 1.2, borderRadius: 2,
                    bgcolor: 'rgba(234,179,8,0.08)',
                    border: '1px dashed #854d0e',
                  }}
                >
                  <WifiOff sx={{ fontSize: 15, color: '#ca8a04', mt: 0.2, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: '#ca8a04', fontWeight: 700, lineHeight: 1.4 }}>
                    NicePay SDK 미로드 — 시뮬레이션 모드로 실행됩니다.
                    실제 서비스 시 개발자 센터에서 clientId를 발급받아
                    <strong> VITE_NICEPAY_CLIENT_ID</strong> 환경변수에 설정하세요.
                  </Typography>
                </Box>
              )}

              {/* NicePay 신뢰 배지 */}
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  p: 1, borderRadius: 2,
                  bgcolor: '#1e293b',
                  border: '1px solid #334155',
                }}
              >
                <OpenInNew sx={{ fontSize: 13, color: '#475569' }} />
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                  나이스페이먼츠 보안 결제창 — PCI DSS Level 1 인증
                </Typography>
              </Box>

              {/* 결제 요청 버튼 */}
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={onPayClick}
                disabled={!canProceed || payAppLoading}
                sx={{
                  mt: 0.5,
                  py: 1.6,
                  borderRadius: 3,
                  fontWeight: 900,
                  fontSize: 16,
                  background: canProceed
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : undefined,
                  boxShadow: canProceed ? '0 4px 20px rgba(16,185,129,0.35)' : undefined,
                  textTransform: 'none',
                  letterSpacing: '-0.3px',
                  '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' },
                }}
              >
                {payAppDetails?.amount?.toLocaleString()}원 결제하기
              </Button>
            </Box>
          </Fade>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 2: 결제 진행 중 (NicePay 결제창 열림)
        ══════════════════════════════════════════════════════════════ */}
        {payStep === 'waiting' && (
          <Fade in timeout={400}>
            <Box sx={{ px: 3, py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
              {/* 아이콘 펄스 애니메이션 */}
              <Box sx={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{
                  position: 'absolute', width: '100%', height: '100%',
                  borderRadius: '50%', border: '2px solid #10b981',
                  opacity: pulse ? 0.15 : 0.6,
                  transform: pulse ? 'scale(1.25)' : 'scale(1)',
                  transition: 'all 0.9s ease-in-out',
                }} />
                <Box sx={{
                  position: 'absolute', width: '78%', height: '78%',
                  borderRadius: '50%', border: '2px solid #10b981',
                  opacity: pulse ? 0.3 : 0.7,
                  transform: pulse ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.9s ease-in-out 0.15s',
                }} />
                <Box sx={{
                  width: 64, height: 64, bgcolor: '#10b981', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 24px rgba(16,185,129,0.5)',
                }}>
                  {terminalConnected
                    ? <Nfc sx={{ fontSize: 32, color: '#fff' }} />
                    : <CircularProgress size={28} sx={{ color: '#fff' }} thickness={5} />
                  }
                </Box>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#f1f5f9', mb: 0.5 }}>
                  {payMethod === 'mock' ? '모의 결제 진행 중' : 'NicePay 결제창 진행 중'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, lineHeight: 1.5 }}>
                  {payMethod === 'mock' ? (
                    <>모의 결제 처리가 진행 중입니다.<br />잠시만 기다려 주세요.</>
                  ) : (
                    <>결제창에서 카드 정보를 입력하고<br />결제를 완료해 주세요.</>
                  )}
                </Typography>
              </Box>

              {/* 결제 수단 표시 */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: 2.5, bgcolor: '#1e293b',
                border: '1px solid #334155', width: '100%',
              }}>
                <Contactless sx={{ color: '#10b981', fontSize: 22 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>결제 수단</Typography>
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 900 }}>
                    {payMethod === 'card' && '신용 / 체크카드'}
                    {payMethod === 'appcard' && '앱카드 (QR/바코드)'}
                    {payMethod === 'easypay' && EASY_PAY_OPTIONS.find(e => e.key === selectedEasyPay)?.label}
                    {payMethod === 'mock' && '테스트용 모의 결제'}
                  </Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Typography variant="body1" sx={{ fontWeight: 900, color: '#10b981' }}>
                    {payAppDetails?.amount?.toLocaleString()}원
                  </Typography>
                </Box>
              </Box>

              <Button
                onClick={() => { setPayAppLoading(false); setPayStep('select'); }}
                variant="outlined"
                size="small"
                sx={{
                  color: '#64748b', borderColor: '#334155', fontWeight: 700,
                  textTransform: 'none', borderRadius: 2,
                  '&:hover': { borderColor: '#ef4444', color: '#ef4444' },
                }}
              >
                취소
              </Button>

              {!terminalConnected && (
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                  ※ 시뮬레이션 모드: 잠시 후 자동으로 처리됩니다.
                </Typography>
              )}
            </Box>
          </Fade>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STEP 3: 승인 완료
        ══════════════════════════════════════════════════════════════ */}
        {payStep === 'done' && (
          <Fade in timeout={400}>
            <Box sx={{ px: 3, py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 80, height: 80, bgcolor: '#10b981', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 32px rgba(16,185,129,0.5)',
                animation: 'pop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                '@keyframes pop': {
                  '0%': { transform: 'scale(0.5)', opacity: 0 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                },
              }}>
                <CheckCircle sx={{ fontSize: 44, color: '#fff' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#10b981' }}>
                결제 승인 완료!
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, textAlign: 'center', lineHeight: 1.6 }}>
                NicePay 결제가 완료되었습니다.<br />예약 세션을 등록 중입니다...
              </Typography>
              <CircularProgress size={24} sx={{ color: '#10b981' }} />
            </Box>
          </Fade>
        )}

      </DialogContent>
    </Dialog>
  );
}
