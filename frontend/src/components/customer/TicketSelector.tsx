import { useEffect } from 'react';
import { Box, Typography, Button, TextField, Select, MenuItem, RadioGroup, FormControlLabel, Radio, Checkbox } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useUserContext, getLocalISOString } from '../../contexts/UserContext';
import { calculateDays } from '../../utils/constants';

export default function TicketSelector() {
  const {
    ticketCategory, setTicketCategory,
    selectedTimeHours, setSelectedTimeHours,
    selectedDayDays, setSelectedDayDays,
    periodStartDate, setPeriodStartDate,
    periodEndDate, setPeriodEndDate,
    entryDateTime, setEntryDateTime,
    exitDateTime, setExitDateTime,
    useLocker, setUseLocker,
    ticketPrices, lockerPrices, seatType
  } = useUserContext();

  const pricesForType = ticketPrices[seatType] || ticketPrices.open || ticketPrices;

  const handleTicketCategoryChange = (category: string) => {
    setTicketCategory(category as any);
    setEntryDateTime(getLocalISOString(new Date()));
  };

  const handleTimeSelect = (hours: number) => {
    setSelectedTimeHours(hours);
    setEntryDateTime(getLocalISOString(new Date()));
  };

  const handleDaySelect = (hours: number) => {
    setSelectedDayDays(hours >= 24 ? hours / 24 : 1);
    setEntryDateTime(getLocalISOString(new Date()));
  };

  const handlePeriodStartChange = (val: string) => {
    setPeriodStartDate(val);
    setEntryDateTime(getLocalISOString(new Date()));
  };

  const handlePeriodEndChange = (val: string) => {
    setPeriodEndDate(val);
    setEntryDateTime(getLocalISOString(new Date()));
  };

  const handleEntryDateChange = (newDate: string) => {
    const parts = entryDateTime.split('T');
    const timePart = parts[1] || '00:00';
    setEntryDateTime(`${newDate}T${timePart}`);
  };
  const handleEntryHourChange = (newHour: string) => {
    const parts = entryDateTime.split('T');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00';
    const minPart = timePart.split(':')[1] || '00';
    setEntryDateTime(`${datePart}T${newHour}:${minPart}`);
  };
  const handleEntryMinChange = (newMin: string) => {
    const parts = entryDateTime.split('T');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00';
    const hourPart = timePart.split(':')[0] || '00';
    setEntryDateTime(`${datePart}T${hourPart}:${newMin}`);
  };

  const handleExitDateChange = (newDate: string) => {
    const parts = exitDateTime.split('T');
    const timePart = parts[1] || '00:00';
    setExitDateTime(`${newDate}T${timePart}`);
  };
  const handleExitHourChange = (newHour: string) => {
    const parts = exitDateTime.split('T');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00';
    const minPart = timePart.split(':')[1] || '00';
    setExitDateTime(`${datePart}T${newHour}:${minPart}`);
  };
  const handleExitMinChange = (newMin: string) => {
    const parts = exitDateTime.split('T');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00';
    const hourPart = timePart.split(':')[0] || '00';
    setExitDateTime(`${datePart}T${hourPart}:${newMin}`);
  };

  // 충전 옵션 선택 시 퇴실 예정 일시 자동 조정
  useEffect(() => {
    if (!entryDateTime) return;
    const baseDate = new Date(entryDateTime);
    let targetDate = new Date(baseDate);
    if (ticketCategory === 'time') {
      targetDate.setHours(baseDate.getHours() + selectedTimeHours);
    } else if (ticketCategory === 'day') {
      targetDate.setDate(baseDate.getDate() + selectedDayDays);
    } else if (ticketCategory === 'period') {
      const days = calculateDays(periodStartDate, periodEndDate);
      targetDate.setDate(baseDate.getDate() + (days || 1));
    }
    setExitDateTime(getLocalISOString(targetDate));
  }, [entryDateTime, ticketCategory, selectedTimeHours, selectedDayDays, periodStartDate, periodEndDate, setExitDateTime]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#475569', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1 }}>
        4. 이용권 요금제 선택
        <Box component="span" sx={{ px: 1, py: 0.2, bgcolor: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 1.5, fontSize: 10, fontWeight: 900 }}>
          고1 이상 입장 가능
        </Box>
      </Typography>
      <RadioGroup
        row
        value={ticketCategory}
        onChange={(e) => handleTicketCategoryChange(e.target.value)}
        sx={{ display: 'flex', gap: 1.5, mb: 2, justifyContent: 'center' }}
      >
        <FormControlLabel
          value="time"
          control={<Radio size="small" color="success" />}
          label={<Typography sx={{ fontWeight: 800, fontSize: 12 }}>시간권</Typography>}
        />
        <FormControlLabel
          value="day"
          control={<Radio size="small" color="success" />}
          label={<Typography sx={{ fontWeight: 800, fontSize: 12 }}>당일권</Typography>}
        />
        <FormControlLabel
          value="period"
          control={<Radio size="small" color="success" />}
          label={<Typography sx={{ fontWeight: 800, fontSize: 12 }}>기간권</Typography>}
        />
      </RadioGroup>

      {/* 세부 옵션들 */}
      <Box sx={{ mb: 2 }}>
        {ticketCategory === 'time' && (
          <Box>
            <Typography variant="caption" sx={{ mb: 1, color: '#475569', display: 'block', fontWeight: 800 }}>시간 선택</Typography>
            <Grid container spacing={1}>
              {pricesForType.time?.map((opt: any) => {
                const isSelected = selectedTimeHours === opt.hours;
                return (
                  <Grid size={{ xs: 4 }} key={opt.hours}>
                    <Button
                      fullWidth
                      variant={isSelected ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => handleTimeSelect(opt.hours)}
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        bgcolor: isSelected ? '#10b981' : '#f1f5f9',
                        borderColor: isSelected ? '#10b981' : '#cbd5e1',
                        color: isSelected ? '#ffffff' : '#475569'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{opt.hours}시간</Typography>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {ticketCategory === 'day' && (
          <Box>
            <Typography variant="caption" sx={{ mb: 1, color: '#475569', display: 'block', fontWeight: 800 }}>일수 선택</Typography>
            <Grid container spacing={1}>
              {pricesForType.day?.map((opt: any) => {
                const isSelected = selectedDayDays === (opt.hours / 24) || (selectedDayDays === 1 && opt.hours === 12);
                return (
                  <Grid size={{ xs: 4 }} key={opt.hours}>
                    <Button
                      fullWidth
                      variant={isSelected ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => handleDaySelect(opt.hours)}
                      sx={{
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        bgcolor: isSelected ? '#10b981' : '#f1f5f9',
                        borderColor: isSelected ? '#10b981' : '#cbd5e1',
                        color: isSelected ? '#ffffff' : '#475569'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{opt.hours >= 24 ? (opt.hours/24) + '일' : opt.hours + '시간 (당일)'}</Typography>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {ticketCategory === 'period' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800 }}>이용 기간 설정</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={periodStartDate}
                onChange={(e) => handlePeriodStartChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ input: { color: '#0f172a', py: 0.8, fontSize: 12 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                value={periodEndDate}
                onChange={(e) => handlePeriodEndChange(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ input: { color: '#0f172a', py: 0.8, fontSize: 12 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* 개인 사물함 옵션 (장기 이용자 전용) */}
      {(ticketCategory === 'day' || ticketCategory === 'period') && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={useLocker} 
                onChange={(e) => setUseLocker(e.target.checked)} 
                color="success" 
                size="small"
              />
            }
            label={
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#166534', display: 'block' }}>
                  개인 사물함 추가 이용
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#15803d', display: 'block', mt: 0.2 }}>
                  (+ {ticketCategory === 'day' ? lockerPrices.day.toLocaleString() : (lockerPrices.periodPerDay * calculateDays(periodStartDate, periodEndDate)).toLocaleString()}원)
                </Typography>
              </Box>
            }
            sx={{ m: 0 }}
          />
        </Box>
      )}

      {/* 24시간제 상세 일시 입력기 */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>입장 일시 (24시간제)</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
          <TextField
            type="date"
            size="small"
            value={entryDateTime.split('T')[0] || ''}
            onChange={(e) => handleEntryDateChange(e.target.value)}
            sx={{ flexGrow: 2, input: { color: '#0f172a', py: 0.8, fontSize: 12 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
          />
          <Select
            value={entryDateTime.split('T')[1]?.split(':')[0] || '00'}
            onChange={(e) => handleEntryHourChange(e.target.value)}
            size="small"
            sx={{ width: '70px', bgcolor: '#f1f5f9', borderRadius: 2, '.MuiSelect-select': { py: 0.8, fontSize: 12, color: '#0f172a', fontWeight: 700 } }}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const h = String(i).padStart(2, '0');
              return <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>{h}시</MenuItem>;
            })}
          </Select>
          <Select
            value={entryDateTime.split('T')[1]?.split(':')[1] || '00'}
            onChange={(e) => handleEntryMinChange(e.target.value)}
            size="small"
            sx={{ width: '70px', bgcolor: '#f1f5f9', borderRadius: 2, '.MuiSelect-select': { py: 0.8, fontSize: 12, color: '#0f172a', fontWeight: 700 } }}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const m = String(i).padStart(2, '0');
              return <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>{m}분</MenuItem>;
            })}
          </Select>
        </Box>

        <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', mb: 0.5, display: 'block' }}>퇴실 일시 (24시간제)</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <TextField
            type="date"
            size="small"
            value={exitDateTime.split('T')[0] || ''}
            onChange={(e) => handleExitDateChange(e.target.value)}
            sx={{ flexGrow: 2, input: { color: '#0f172a', py: 0.8, fontSize: 12 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
          />
          <Select
            value={exitDateTime.split('T')[1]?.split(':')[0] || '00'}
            onChange={(e) => handleExitHourChange(e.target.value)}
            size="small"
            sx={{ width: '70px', bgcolor: '#f1f5f9', borderRadius: 2, '.MuiSelect-select': { py: 0.8, fontSize: 12, color: '#0f172a', fontWeight: 700 } }}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const h = String(i).padStart(2, '0');
              return <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>{h}시</MenuItem>;
            })}
          </Select>
          <Select
            value={exitDateTime.split('T')[1]?.split(':')[1] || '00'}
            onChange={(e) => handleExitMinChange(e.target.value)}
            size="small"
            sx={{ width: '70px', bgcolor: '#f1f5f9', borderRadius: 2, '.MuiSelect-select': { py: 0.8, fontSize: 12, color: '#0f172a', fontWeight: 700 } }}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const m = String(i).padStart(2, '0');
              return <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>{m}분</MenuItem>;
            })}
          </Select>
        </Box>
      </Box>
    </Box>
  );
}
