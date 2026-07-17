import { useState } from 'react';
import { Box, Typography, Menu as MuiMenu, MenuItem } from '@mui/material';
import { Send, DeleteForever, Refresh } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { useChatContext } from '../../contexts/ChatContext';
import { API_URL } from '../../utils/constants';

const seatCoordinates: Record<string, { top: number, left: number }> = {
  'seat-16G': { top: 60, left: 50 }, 'seat-15G': { top: 60, left: 150 }, 'seat-14G': { top: 60, left: 250 },
  'seat-13G': { top: 60, left: 350 }, 'seat-12G': { top: 60, left: 450 }, 'seat-11G': { top: 60, left: 550 },
  'seat-17G': { top: 250, left: 60 }, 'seat-18G': { top: 250, left: 115 }, 'seat-19G': { top: 250, left: 170 },
  'seat-22G': { top: 305, left: 60 }, 'seat-21G': { top: 305, left: 115 }, 'seat-20G': { top: 305, left: 170 },
  'seat-4G': { top: 250, left: 330 }, 'seat-5G': { top: 250, left: 385 }, 'seat-6G': { top: 250, left: 440 },
  'seat-3G': { top: 305, left: 330 }, 'seat-2G': { top: 305, left: 385 }, 'seat-1G': { top: 305, left: 440 },
  'seat-10G': { top: 250, left: 550 }, 'seat-9G': { top: 305, left: 550 },
  'seat-8G': { top: 480, left: 550 }, 'seat-7G': { top: 535, left: 550 },
  'seat-24G': { top: 535, left: 60 }, 'seat-26G': { top: 535, left: 115 },
  'seat-23G': { top: 590, left: 60 }, 'seat-25G': { top: 590, left: 115 },
};

interface SeatMonitorProps {
  onOpenChat?: () => void;
}

export default function SeatMonitor({ onOpenChat }: SeatMonitorProps) {
  const { seats, setSeats, storeId } = useAppContext();
  const { setSelectedAdminSessionId } = useChatContext();
  
  const [seatMenuAnchor, setSeatMenuAnchor] = useState<HTMLElement | null>(null);
  const [seatMenuTarget, setSeatMenuTarget] = useState<any>(null);

  const handleResetSession = async (sessionId: string) => {
    if (!window.confirm('정말 이 세션을 초기화(강제 종료) 하시겠습니까?\n\n- 해당 고객은 즉시 퇴실 처리되며 재입장할 수 없습니다.\n- 출입문 상태는 변경되지 않고 관리자 시스템 상에서만 종료됩니다.')) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/reset-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, store_id: storeId })
      });
      const data = await res.json();
      if (res.ok) {
        alert('세션이 강제로 종료 및 초기화되었습니다.');
        // 좌석 현황 재조회하여 화면 갱신
        const seatsRes = await fetch(`${API_URL}/seats?store_id=${storeId}`);
        if (seatsRes.ok) {
          const seatsData = await seatsRes.json();
          setSeats(seatsData.seats);
        }
      } else {
        alert(`초기화 실패: ${data.detail || '알 수 없는 오류'}`);
      }
    } catch (e) {
      alert(`초기화 중 오류가 발생했습니다: ${e}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              실시간 좌석 현황판 (20석)
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              좌석을 클릭하여 채팅, 예약 확인 및 강제 초기화를 수행할 수 있습니다.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#10b981', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>이용 중</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#f59e0b', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>외출 중</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#3b82f6', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>입실 대기</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: '#334155', borderRadius: '50%' }} />
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>빈 좌석</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 0, bgcolor: '#0f172a', overflow: 'auto', borderRadius: 4, border: '1px solid #334155' }}>
        <Box sx={{ 
          width: 700, 
          height: 700, 
          position: 'relative', 
          mx: 'auto',
          my: 2,
          bgcolor: '#1e293b',
          border: '1px solid #334155',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* ZONE 텍스트들 */}
          <Typography sx={{ position: 'absolute', top: 160, left: 280, color: '#475569', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>VICTOR ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 410, left: 60, color: '#475569', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>PROCOPE ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 650, left: 400, color: '#475569', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>REST ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 580, left: 280, color: '#475569', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>HALL</Typography>
          
          {/* 입구 표시 영역 */}
          <Box sx={{ position: 'absolute', top: 500, left: 210, width: 140, height: 200, border: '2px solid #334155', borderBottom: 'none' }}>
            <Box sx={{ position: 'absolute', top: -10, left: 20, textAlign: 'center', bgcolor: '#1e293b', px: 1 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>▲</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#94a3b8' }}>입구</Typography>
            </Box>
            <Box sx={{ position: 'absolute', top: 30, left: 25, width: 20, height: 20, borderRadius: '50%', bgcolor: '#f59e0b', border: '4px solid #ea580c', boxShadow: '0 0 5px rgba(234, 88, 12, 0.5)' }} />
          </Box>

          {/* 중앙 가림막 디테일 */}
          <Box sx={{ position: 'absolute', top: 295, left: 60, width: 160, height: 6, bgcolor: '#334155' }} />
          <Box sx={{ position: 'absolute', top: 295, left: 330, width: 160, height: 6, bgcolor: '#334155' }} />
          <Box sx={{ position: 'absolute', top: 535, left: 110, width: 6, height: 105, bgcolor: '#334155' }} />

          {/* 좌석 렌더링 */}
          {seats.map((seat) => {
            const rawNum = seat.name.replace('번 좌석', '');
            const mapId = `seat-${rawNum}G`;
            const coords = seatCoordinates[mapId];
            
            if (!coords) return null;

            let bgColor = '#334155';
            let borderColor = '#475569';
            let textColor = '#94a3b8';

            if (seat.is_occupied) {
              if (seat.status === 'reserved') {
                bgColor = 'rgba(59, 130, 246, 0.2)';
                borderColor = '#3b82f6';
                textColor = '#60a5fa';
              } else if (seat.status === 'outing') {
                bgColor = 'rgba(245, 158, 11, 0.2)';
                borderColor = '#f59e0b';
                textColor = '#fbbf24';
              } else {
                bgColor = 'rgba(16, 185, 129, 0.2)';
                borderColor = '#10b981';
                textColor = '#34d399';
              }
            }

            return (
              <Box
                key={seat.id}
                onClick={(e) => {
                  setSeatMenuAnchor(e.currentTarget);
                  setSeatMenuTarget(seat);
                }}
                sx={{
                  position: 'absolute',
                  top: coords.top,
                  left: coords.left,
                  width: 50,
                  height: 45,
                  bgcolor: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  boxShadow: seatMenuTarget?.id === seat.id ? `0 0 10px ${borderColor}` : 'none',
                  '&:active': { transform: 'scale(0.95)' }
                }}
              >
                <Box sx={{ position: 'absolute', left: -6, top: 12, width: 6, height: 20, border: `1.5px solid ${borderColor}`, borderRight: 'none', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }} />
                
                <Typography sx={{ fontWeight: 900, fontSize: 13, color: textColor }}>
                  {rawNum}G
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* 좌석 미니 메뉴 팝오버 */}
      <MuiMenu
        anchorEl={seatMenuAnchor}
        open={Boolean(seatMenuAnchor)}
        onClose={() => { setSeatMenuAnchor(null); setSeatMenuTarget(null); }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 3,
              color: '#f8fafc',
              minWidth: 180,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }
          }
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        {/* 좌석 헤더 */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #334155' }}>
          <Typography variant="caption" sx={{ fontWeight: 900, color: '#10b981', display: 'block' }}>
            {seatMenuTarget?.name} {seatMenuTarget?.is_occupied ? `— ${seatMenuTarget?.metadata?.user_name || '이용객'}` : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10 }}>
            {seatMenuTarget?.is_occupied 
              ? (seatMenuTarget.status === 'reserved' ? '입실 대기 중' : seatMenuTarget.status === 'outing' ? '외출 중' : '이용 중') 
              : '빈 좌석'}
          </Typography>
        </Box>

        {/* 채팅 */}
        <MenuItem
          disabled={!seatMenuTarget?.is_occupied || !seatMenuTarget?.session_id}
          onClick={() => {
            if (seatMenuTarget?.session_id) {
              setSelectedAdminSessionId(seatMenuTarget.session_id);
              if (onOpenChat) onOpenChat();
            }
            setSeatMenuAnchor(null);
            setSeatMenuTarget(null);
          }}
          sx={{
            color: '#f8fafc',
            gap: 1.5,
            '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.12)' },
            '&.Mui-disabled': { opacity: 0.35 }
          }}
        >
          <Send sx={{ fontSize: 16, color: '#10b981' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>채팅 상담 열기</Typography>
        </MenuItem>

        {/* 예약 상세 */}
        <MenuItem
          disabled={!seatMenuTarget?.is_occupied}
          onClick={() => {
            const meta = seatMenuTarget?.metadata;
            if (meta) {
              const txt = [
                `이름: ${meta.user_name || '-'}`,
                `이용권: ${meta.ticket_type === 'time' ? '시간권' : meta.ticket_type === 'day' ? '당일권' : '기간권'}`,
                `입장: ${meta.scheduled_entry_time ? new Date(meta.scheduled_entry_time).toLocaleString('ko-KR', { hour12: false }) : '-'}`,
                `퇴실: ${meta.scheduled_exit_time ? new Date(meta.scheduled_exit_time).toLocaleString('ko-KR', { hour12: false }) : '-'}`,
                `결제금액: ${meta.amount ? meta.amount.toLocaleString() + '원' : '-'}`,
                `PIN: ${meta.access_pin || '-'}`,
              ].join('\n');
              alert(`📋 ${seatMenuTarget.name} 예약 상세\n\n${txt}`);
            }
            setSeatMenuAnchor(null);
            setSeatMenuTarget(null);
          }}
          sx={{
            color: '#f8fafc',
            gap: 1.5,
            '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.12)' },
            '&.Mui-disabled': { opacity: 0.35 }
          }}
        >
          <Refresh sx={{ fontSize: 16, color: '#10b981' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>예약 상세 보기</Typography>
        </MenuItem>

        {/* 초기화 */}
        <MenuItem
          disabled={!seatMenuTarget?.is_occupied || !seatMenuTarget?.session_id}
          onClick={() => {
            if (seatMenuTarget?.session_id) {
              handleResetSession(seatMenuTarget.session_id);
            }
            setSeatMenuAnchor(null);
            setSeatMenuTarget(null);
          }}
          sx={{
            color: '#ef4444',
            gap: 1.5,
            borderTop: '1px solid #334155',
            mt: 0.5,
            pt: 1.5,
            '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)' },
            '&.Mui-disabled': { opacity: 0.35 }
          }}
        >
          <DeleteForever sx={{ fontSize: 16, color: '#ef4444' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>세션 강제 초기화</Typography>
        </MenuItem>

        {/* 취소 */}
        <MenuItem
          disabled={!seatMenuTarget?.is_occupied || !seatMenuTarget?.session_id}
          onClick={() => {
            if (seatMenuTarget?.session_id) {
              handleResetSession(seatMenuTarget.session_id);
            }
            setSeatMenuAnchor(null);
            setSeatMenuTarget(null);
          }}
          sx={{
            color: '#f59e0b',
            gap: 1.5,
            mt: 0.5,
            '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.12)' },
            '&.Mui-disabled': { opacity: 0.35 }
          }}
        >
          <DeleteForever sx={{ fontSize: 16, color: '#f59e0b' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>예약/결제 취소 (삭제)</Typography>
        </MenuItem>
      </MuiMenu>
    </Box>
  );
}
