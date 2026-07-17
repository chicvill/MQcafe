import { useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { 
  QrCodeScanner, 
  CreditCard, 
  MeetingRoom, 
  Inventory, 
  SwapHoriz, 
  DirectionsWalk, 
  Contactless,
  HeadsetMic,
  MapOutlined
} from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { useAppContext } from '../contexts/AppContext';

export default function QRPoster() {
  const { storeId, stores } = useAppContext();
  
  const activeStore = stores.find(s => s.id === storeId);
  const storeName = activeStore ? activeStore.name : '';
  
  // 실제 서비스 주소로 변경
  const customerUrl = `https://stcafe.chicvill.store/customer?store=${storeId}`;

  useEffect(() => {
    // 인쇄용 스타일 적용 (A3 사이즈)
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A3 portrait; margin: 0; }
        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;800;900&display=swap');
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const features = [
    {
      num: '01',
      icon: <QrCodeScanner sx={{ fontSize: 40 }} />,
      title: 'QR코드 로그인',
      desc: 'QR코드를 스마트폰 카메라로 스캔하면 바로 매장 접속 화면이 열립니다. 앱 설치가 필요 없습니다.',
      color: '#10b981', // 녹색계열
      bg: '#d1fae5'
    },
    {
      num: '02',
      icon: <CreditCard sx={{ fontSize: 40 }} />,
      title: '간편 결제',
      desc: '원하는 좌석과 이용권(시간/기간)을 선택한 후 스마트폰에서 즉시 결제할 수 있습니다.',
      color: '#10b981',
      bg: '#d1fae5'
    },
    {
      num: '03',
      icon: <Contactless sx={{ fontSize: 40 }} />,
      title: '출입문 간편 등록 및 이용',
      desc: '결제 후 화면에서 [카드 간편 연동]을 누르고, 소지하신 카드(교통/신용카드)를 태그하여 출입증으로 등록하세요.',
      color: '#3b82f6', // 파란색계열
      bg: '#dbeafe'
    },
    {
      num: '04',
      icon: <MeetingRoom sx={{ fontSize: 40 }} />,
      title: '출입문 열기',
      desc: '등록한 카드를 입구 리더기에 태그하거나, 모바일 화면의 [출입문 열기] 버튼을 눌러 언제든 입장할 수 있습니다.',
      color: '#8b5cf6', // 보라색계열
      bg: '#ede9fe'
    },
    {
      num: '05',
      icon: <Inventory sx={{ fontSize: 40 }} />,
      title: '사물함 신청',
      desc: '무거운 짐이 있다면 모바일 기기 화면에서 [사물함] 탭을 눌러 빈 사물함을 바로 결제하고 사용할 수 있습니다.',
      color: '#f59e0b', // 주황색계열
      bg: '#fef3c7'
    },
    {
      num: '06',
      icon: <SwapHoriz sx={{ fontSize: 40 }} />,
      title: '좌석 이동',
      desc: '이용 중 자리를 바꾸고 싶다면 화면의 [좌석 이동] 버튼을 눌러 현재 비어있는 자리로 자유롭게 변경 가능합니다.',
      color: '#ec4899', // 핑크색계열
      bg: '#fce7f3'
    },
    {
      num: '07',
      icon: <DirectionsWalk sx={{ fontSize: 40 }} />,
      title: '외출 및 복귀',
      desc: '잠시 나갈 때는 화면에서 [외출하기]를 누르세요. 다시 돌아올 때 카드를 태그하거나 [복귀하기]를 누르면 됩니다.',
      color: '#6366f1', // 남색계열
      bg: '#e0e7ff'
    },
    {
      num: '08',
      icon: <HeadsetMic sx={{ fontSize: 40 }} />,
      title: '고객센터',
      desc: '이용 중 궁금한 사항은 앱 내 고객센터 또는 매장 내 안내데스크로 문의해 주세요. 친절히 도와드리겠습니다.',
      color: '#0ea5e9', // 하늘색계열
      bg: '#e0f2fe'
    },
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#e2e8f0', // 외부 배경
      py: 4, 
      display: 'flex', 
      justifyContent: 'center',
      fontFamily: "'Pretendard', sans-serif"
    }}>
      <Paper 
        elevation={0}
        sx={{ 
          width: '297mm', // A3 가로
          height: '420mm', // A3 세로 고정
          bgcolor: 'white', 
          p: '15mm', // 여백
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* 상단 타이틀 영역 */}
        <Box sx={{ textAlign: 'center', mb: 3, pt: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b', letterSpacing: '-1px', mb: 1, fontFamily: 'inherit' }}>
            <span style={{ color: '#10b981' }}>MQcafe</span>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5 }}>
            <Box sx={{ height: '3px', width: '30px', bgcolor: '#10b981' }} />
            <Typography variant="h2" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-1.5px', fontFamily: 'inherit' }}>
              {(storeName || '운정 산내점').replace('MQcafe ', '')}
            </Typography>
            <Box sx={{ height: '3px', width: '30px', bgcolor: '#10b981' }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: '-0.5px', fontFamily: 'inherit' }}>
            스마트한 공간, 간편한 이용, 쾌적한 경험을 제공합니다.
          </Typography>
        </Box>

        {/* QR 안내 배너 */}
        <Box sx={{ 
          display: 'flex', 
          border: '1px solid #e2e8f0', 
          borderRadius: 3, 
          overflow: 'hidden',
          mb: 4,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <Box sx={{ 
            bgcolor: '#10b981', 
            color: 'white', 
            p: 2.5, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minWidth: '160px'
          }}>
            <QrCodeScanner sx={{ fontSize: 36, mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', textAlign: 'center', lineHeight: 1.2, fontFamily: 'inherit' }}>
              QR 코드로<br/>간편 시작
            </Typography>
          </Box>
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            flexGrow: 1 
          }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.5, wordBreak: 'keep-all', fontFamily: 'inherit' }}>
              QR 코드를 스캔하여 <span style={{ color: '#10b981' }}>좌석을 선택</span>하고,<br/>
              <span style={{ color: '#10b981' }}>이용권을 구입</span>한 뒤 입장하여 이용할 수 있습니다.
            </Typography>
          </Box>
        </Box>

        {/* 안내 사항 그리드 (4x2) */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 3 }} key={index}>
                <Box sx={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: 3, 
                  p: 2.5, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  {/* 숫자 뱃지 */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    left: 12, 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    bgcolor: feature.color, 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {feature.num}
                  </Box>
                  
                  {/* 아이콘 */}
                  <Box sx={{ 
                    width: 70, 
                    height: 70, 
                    borderRadius: '50%', 
                    bgcolor: feature.bg, 
                    color: feature.color,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 2,
                    mt: 1
                  }}>
                    {feature.icon}
                  </Box>

                  {/* 텍스트 */}
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1, fontSize: '1rem', fontFamily: 'inherit' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.4, wordBreak: 'keep-all', fontSize: '0.75rem', fontFamily: 'inherit' }}>
                    {feature.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 매장 안내도 (어두운 배경) */}
        <Box sx={{ 
          bgcolor: '#0f172a', // 아주 어두운 남색
          borderRadius: 4, 
          p: 3, 
          mb: 3,
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'white' }}>
            <MapOutlined />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px', fontFamily: 'inherit' }}>
              매장 안내도 <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>FLOOR PLAN</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, flexGrow: 1 }}>
            {/* 좌측: 도면 이미지 */}
            <Box sx={{ 
              flex: 2, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              p: 2,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <img 
                src="/layout_map.png" 
                alt="매장 안내도" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '220px', 
                  objectFit: 'contain',
                  filter: 'invert(1) hue-rotate(180deg) opacity(0.9)' // 흰색 배경 도면을 어두운 테마에 어울리게 반전
                }} 
              />
            </Box>

            {/* 우측: 범례(Legend) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5 }}>
              {[
                { label: '개인석', color: '#22c55e', desc: '집중이 필요한 학습을 위한 편안한 좌석' },
                { label: '1인석', color: '#14b8a6', desc: '간단한 공부나 작업을 위한 1인 전용 좌석' },
                { label: '회의실', color: '#a855f7', desc: '스터디 모임 및 그룹 회의를 위한 공간' },
                { label: '카페존', color: '#ec4899', desc: '휴식과 간단한 식사가 가능한 공간' },
                { label: '사물함', color: '#eab308', desc: '개인 소지품 보관을 위한 사물함' },
                { label: '복합기', color: '#3b82f6', desc: '프린트, 복사, 스캔이 가능한 복합기' }
              ].map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ 
                    minWidth: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    bgcolor: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    mt: 0.2
                  }}>
                    {item.label[0]}
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2, fontFamily: 'inherit' }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', lineHeight: 1.3, fontFamily: 'inherit', wordBreak: 'keep-all' }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* 하단 QR 및 스펙 바 */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
          {/* QR 코드 영역 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 3,
            p: 2,
            flex: 1
          }}>
            <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <QRCodeCanvas value={customerUrl} size={80} level="H" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5, fontFamily: 'inherit' }}>
                지금 바로 시작하기
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.3, wordBreak: 'keep-all', fontFamily: 'inherit' }}>
                스마트폰 카메라로 좌측 QR코드를 스캔해 주세요.<br/>
                빠르고 간편하게 스터디카페를 이용할 수 있습니다.
              </Typography>
            </Box>
          </Box>

          {/* 우측 녹색 강조 바 */}
          <Box sx={{ 
            display: 'flex', 
            bgcolor: '#10b981', 
            borderRadius: 3, 
            color: 'white',
            flex: 1,
            overflow: 'hidden'
          }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <Contactless sx={{ fontSize: 28, mb: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit' }}>안전하고 편리한<br/>스마트 출입 시스템</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <MeetingRoom sx={{ fontSize: 28, mb: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit' }}>실시간 좌석 현황<br/>및 예약 관리</Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, textAlign: 'center' }}>
              <CreditCard sx={{ fontSize: 28, mb: 0.5 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'inherit' }}>다양한 결제 방법<br/>및 이용권 옵션</Typography>
            </Box>
          </Box>
        </Box>
        
        {/* 하단 푸터 장식 */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#cbd5e1', letterSpacing: '2px', fontWeight: 600, fontFamily: 'inherit' }}>
            ———— MODERN STUDY CAFE ————
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
