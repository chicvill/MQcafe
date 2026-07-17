import { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Popover, MenuList, MenuItem } from '@mui/material';
import { useAppContext } from '../../contexts/AppContext';
import { useUserContext, getLocalISOString } from '../../contexts/UserContext';
import { API_URL } from '../../utils/constants';

const seatCoordinates: Record<string, { top: number, left: number }> = {
  // Top row
  'seat-16G': { top: 60, left: 50 },
  'seat-15G': { top: 60, left: 150 },
  'seat-14G': { top: 60, left: 250 },
  'seat-13G': { top: 60, left: 350 },
  'seat-12G': { top: 60, left: 450 },
  'seat-11G': { top: 60, left: 550 },

  // PROCOPE ZONE (left block)
  'seat-17G': { top: 250, left: 60 },
  'seat-18G': { top: 250, left: 115 },
  'seat-19G': { top: 250, left: 170 },
  'seat-22G': { top: 305, left: 60 },
  'seat-21G': { top: 305, left: 115 },
  'seat-20G': { top: 305, left: 170 },

  // VICTOR ZONE (middle block)
  'seat-4G': { top: 250, left: 330 },
  'seat-5G': { top: 250, left: 385 },
  'seat-6G': { top: 250, left: 440 },
  'seat-3G': { top: 305, left: 330 },
  'seat-2G': { top: 305, left: 385 },
  'seat-1G': { top: 305, left: 440 },

  // Right Edge
  'seat-10G': { top: 250, left: 550 },
  'seat-9G':  { top: 305, left: 550 },
  
  'seat-8G': { top: 480, left: 550 },
  'seat-7G': { top: 535, left: 550 },

  // Bottom Left
  'seat-24G': { top: 535, left: 60 },
  'seat-26G': { top: 535, left: 115 },
  'seat-23G': { top: 590, left: 60 },
  'seat-25G': { top: 590, left: 115 },
};

export default function SeatMapModal({ fetchSeats }: any) {
  const { openSeatModal, setOpenSeatModal, seats, seatMapMode } = useAppContext();
  const { tableId, setTableId, setEntryDateTime, setExitDateTime, activeSession, setActiveSession, setSeatType } = useUserContext();

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);

  const handleSeatClick = (event: React.MouseEvent<HTMLDivElement>, seat: any) => {
    if (seatMapMode === 'move' && seat.is_occupied) {
      alert('이미 사용 중인 좌석입니다. 빈 좌석을 선택해 주십시오.');
      return;
    }
    setAnchorEl(event.currentTarget);
    setSelectedSeat(seat);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedSeat(null);
  };

  const handleSelectSeatAction = () => {
    if (!selectedSeat) return;
    const seat = selectedSeat;
    const isOccupied = seat.is_occupied;

    if (!isOccupied) {
      setTableId(seat.id);
      if (seat.type === 'open' || seat.type === 'focus') setSeatType(seat.type);
      setOpenSeatModal(false);
      handleClosePopover();
    } else {
      const exitStr = seat.metadata?.scheduled_exit_time;
      if (!exitStr) {
        alert('종료 시간을 알 수 없어 예약할 수 없습니다.');
        return;
      }
      const exitDt = new Date(exitStr);
      exitDt.setMinutes(exitDt.getMinutes() + 10);
      
      setTableId(seat.id);
      if (seat.type === 'open' || seat.type === 'focus') setSeatType(seat.type);
      // Set entry time to 10 mins after exit
      const newEntry = getLocalISOString(exitDt);
      setEntryDateTime(newEntry);
      // Also adjust exit time so duration is preserved (default 2 hrs if not set)
      const newExit = new Date(exitDt);
      newExit.setHours(newExit.getHours() + 2);
      setExitDateTime(getLocalISOString(newExit));
      
      setOpenSeatModal(false);
      handleClosePopover();
    }
  };

  const handleMoveSeatAction = async () => {
    if (!selectedSeat || !activeSession) return;
    const seat = selectedSeat;
    const seatNo = seat.name.replace('번 좌석', '');
    
    try {
      const res = await fetch(`${API_URL}/seats/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          new_table_id: seat.id
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setActiveSession({
          ...activeSession,
          table_id: seat.id
        });
        setTableId(seat.id);
        fetchSeats();
        setOpenSeatModal(false);
        handleClosePopover();
        alert(`🎉 좌석 이동 완료!\n\n${seatNo}G 좌석으로 이동되었습니다.`);
      } else {
        alert(data.detail || '좌석 이동 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog 
      open={openSeatModal} 
      onClose={() => setOpenSeatModal(false)}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#f8fafc',
            color: '#0f172a',
            borderRadius: 4,
            border: '1px solid #e2e8f0',
          }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', pb: 1, borderBottom: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        실시간 도면 좌석 선택
      </DialogTitle>
      
      {/* 범례 표시부 */}
      <Box sx={{ display: 'flex', gap: 2, p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: '#94a3b8', borderRadius: '50%' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>선택불가 (사용중)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: '#fcd34d', borderRadius: '20%' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>퇴실예정석 (예약가능)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: '#ffffff', border: '2px solid #000', borderRadius: '50%' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>선택가능</Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, bgcolor: '#f1f5f9', overflow: 'auto' }}>
        {/* 평면도 캔버스 영역 */}
        <Box sx={{ 
          width: 700, 
          height: 700, 
          position: 'relative', 
          mx: 'auto',
          my: 2,
          bgcolor: '#fafafa',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {/* ZONE 텍스트들 */}
          <Typography sx={{ position: 'absolute', top: 160, left: 280, color: '#94a3b8', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>VICTOR ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 410, left: 60, color: '#94a3b8', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>PROCOPE ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 650, left: 400, color: '#94a3b8', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>REST ZONE</Typography>
          <Typography sx={{ position: 'absolute', top: 580, left: 280, color: '#94a3b8', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>HALL</Typography>
          
          {/* 입구 표시 영역 */}
          <Box sx={{ position: 'absolute', top: 500, left: 210, width: 140, height: 200, border: '2px solid #cbd5e1', borderBottom: 'none' }}>
            <Box sx={{ position: 'absolute', top: -10, left: 20, textAlign: 'center', bgcolor: '#fafafa', px: 1 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 900 }}>▲</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900 }}>입구</Typography>
            </Box>
            <Box sx={{ position: 'absolute', top: 30, left: 25, width: 20, height: 20, borderRadius: '50%', bgcolor: '#ffed4a', border: '4px solid #f97316', boxShadow: '0 0 5px rgba(249, 115, 22, 0.5)' }} />
          </Box>

          {/* 중앙 가림막 디테일 (테이블 사이 회색 줄) */}
          <Box sx={{ position: 'absolute', top: 295, left: 60, width: 160, height: 6, bgcolor: '#cbd5e1' }} />
          <Box sx={{ position: 'absolute', top: 295, left: 330, width: 160, height: 6, bgcolor: '#cbd5e1' }} />
          <Box sx={{ position: 'absolute', top: 535, left: 110, width: 6, height: 105, bgcolor: '#cbd5e1' }} />

          {/* 좌석 렌더링 */}
          {seats.map((seat) => {
            const rawNum = seat.name.replace('번 좌석', '');
            const mapId = `seat-${rawNum}G`;
            const coords = seatCoordinates[mapId];
            
            if (!coords) return null; // 도면에 매핑되지 않은 좌석 무시

            const isOccupied = seat.is_occupied;
            const isSelected = tableId === seat.id;
            const isOuting = seat.status === 'outing';
            
            let bgColor = '#ffffff'; 
            let borderColor = '#000000';
            let textColor = '#000000';
            let borderRadius = '4px';

            if (isSelected) {
              bgColor = '#10b981';
              borderColor = '#059669';
              textColor = '#ffffff';
            } else if (isOccupied) {
              if (isOuting) {
                // 퇴실 예정석 (주황/노랑)
                bgColor = '#fcd34d';
                borderColor = '#fbbf24';
              } else {
                // 선택 불가 (회색)
                bgColor = '#94a3b8';
                borderColor = '#64748b';
                textColor = '#ffffff';
              }
            }

            return (
              <Box
                key={seat.id}
                onClick={(e) => handleSeatClick(e, seat)}
                sx={{
                  position: 'absolute',
                  top: coords.top,
                  left: coords.left,
                  width: 50,
                  height: 45,
                  bgcolor: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: borderRadius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  boxShadow: isSelected ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
                  '&:active': { transform: 'scale(0.95)' }
                }}
              >
                {/* 컵 모양 디테일 추가 (좌석의 방향을 상징) */}
                <Box sx={{ position: 'absolute', left: -6, top: 12, width: 6, height: 20, border: `1.5px solid ${borderColor}`, borderRight: 'none', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }} />
                
                <Typography sx={{ fontWeight: 900, fontSize: 13, color: textColor }}>
                  {rawNum}G
                </Typography>
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center', bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={() => setOpenSeatModal(false)} variant="contained" color="inherit" sx={{ borderRadius: 3, px: 4, fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}>
          닫기
        </Button>
      </DialogActions>

      {/* 터치 액션 팝업 메뉴 */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: { sx: { borderRadius: 3, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', minWidth: 150, mt: 1 } }
        }}
      >
        <MenuList>
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #f1f5f9', mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, color: '#1e293b' }}>
              {selectedSeat?.name.replace('번 좌석', '')}G 좌석
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
              {selectedSeat?.is_occupied ? (selectedSeat.status === 'outing' ? '예약가능 (퇴실예정)' : '현재 사용 중') : '선택 가능'}
            </Typography>
          </Box>
          
          {seatMapMode === 'move' ? (
            <MenuItem onClick={handleMoveSeatAction} sx={{ fontWeight: 700, color: '#0284c7', py: 1.5 }}>
              이 좌석으로 이동
            </MenuItem>
          ) : (
            <MenuItem onClick={handleSelectSeatAction} sx={{ fontWeight: 700, color: '#10b981', py: 1.5 }}>
              {selectedSeat?.is_occupied ? '예약 대기하기' : '이 좌석 선택하기'}
            </MenuItem>
          )}
          <MenuItem onClick={handleClosePopover} sx={{ fontWeight: 700, color: '#64748b', py: 1.5 }}>
            취소
          </MenuItem>
        </MenuList>
      </Popover>

    </Dialog>
  );
}
