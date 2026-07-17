import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, IconButton, List, ListItem, ListItemText, Switch, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DeleteOutlined, SaveAlt } from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Dayjs } from 'dayjs';
import { useAppContext } from '../../contexts/AppContext';
import { API_URL } from '../../utils/constants';

interface EventRule {
  id: string;
  name: string;
  is_active: boolean;
  conditions: {
    time_range_start: string | null;
    time_range_end: string | null;
    days_of_week: string[]; // e.g. ['월', '화']
    ticket_type: string | null;
    min_duration_hours: number | null;
  };
  effects: {
    discount_amount: number;
    discount_percent: number;
    bonus_minutes: number;
  };
}

export default function EventEngine({ fetchStores }: { fetchStores: () => Promise<void> }) {
  const { stores, storeId, setStoreId } = useAppContext();
  const selectedStore = stores.find(s => s.id === storeId);
  
  const [rules, setRules] = useState<EventRule[]>([]);
  const [policy, setPolicy] = useState<'overlap' | 'max_benefit'>('max_benefit');

  // Form states
  const [ruleName, setRuleName] = useState('');
  const [condTimeStart, setCondTimeStart] = useState<Dayjs | null>(null);
  const [condTimeEnd, setCondTimeEnd] = useState<Dayjs | null>(null);
  const [condDays, setCondDays] = useState<string[]>([]);
  const [condTicket, setCondTicket] = useState('');
  const [condMinHours, setCondMinHours] = useState<number | ''>('');
  
  const [effDiscountAmount, setEffDiscountAmount] = useState<number | ''>('');
  const [effDiscountPercent, setEffDiscountPercent] = useState<number | ''>('');
  const [effBonusMin, setEffBonusMin] = useState<number | ''>('');

  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  useEffect(() => {
    if (selectedStore) {
      setRules(selectedStore.metadata?.event_rules || []);
      setPolicy(selectedStore.metadata?.event_policy || 'max_benefit');
    }
  }, [selectedStore]);

  const handleSaveToServer = async (newRules: EventRule[], newPolicy: string) => {
    if (!selectedStore) return;
    try {
      const res = await fetch(`${API_URL}/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedStore.name, 
          ceo_name: selectedStore.ceo_name, 
          metadata: { ...selectedStore.metadata, event_rules: newRules, event_policy: newPolicy } 
        })
      });
      if (res.ok) {
        alert('이벤트 정책이 저장되었습니다.');
        fetchStores();
      } else {
        alert('저장 실패');
      }
    } catch (e) {
      alert('서버 오류');
    }
  };

  const handleAddRule = () => {
    if (!ruleName.trim()) {
      alert('이벤트 이름을 입력해주세요.');
      return;
    }
    const newRule: EventRule = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      is_active: true,
      conditions: {
        time_range_start: condTimeStart ? condTimeStart.format('HH:mm') : null,
        time_range_end: condTimeEnd ? condTimeEnd.format('HH:mm') : null,
        days_of_week: condDays,
        ticket_type: condTicket || null,
        min_duration_hours: condMinHours ? Number(condMinHours) : null,
      },
      effects: {
        discount_amount: effDiscountAmount ? Number(effDiscountAmount) : 0,
        discount_percent: effDiscountPercent ? Number(effDiscountPercent) : 0,
        bonus_minutes: effBonusMin ? Number(effBonusMin) : 0,
      }
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    setRuleName(''); setCondTimeStart(null); setCondTimeEnd(null); setCondDays([]); setCondTicket(''); setCondMinHours('');
    setEffDiscountAmount(''); setEffDiscountPercent(''); setEffBonusMin('');
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r);
    setRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
  };

  const handleSaveAll = () => {
    handleSaveToServer(rules, policy);
  };

  const toggleDay = (day: string) => {
    setCondDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>매장 선택</Typography>
          <FormControl fullWidth size="small">
            <Select value={storeId || ''} onChange={(e) => setStoreId(e.target.value)}>
              {stores.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        <Card sx={{ bgcolor: '#fffbeb', borderRadius: 3, border: '1px solid #fde68a', mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#b45309', mb: 1 }}>중복 혜택 정책</Typography>
            <Typography variant="body2" sx={{ color: '#92400e', mb: 2 }}>
              고객이 2개 이상의 할인 조건에 맞을 때 어떻게 처리할지 선택합니다.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: policy === 'max_benefit' ? 'rgba(255,255,255,0.7)' : 'transparent', p: 1, borderRadius: 1 }}>
                <Typography sx={{ fontWeight: policy === 'max_benefit' ? 700 : 400 }}>최대 혜택 우선 적용 (권장)</Typography>
                <Switch checked={policy === 'max_benefit'} onChange={() => setPolicy('max_benefit')} color="primary" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: policy === 'overlap' ? 'rgba(255,255,255,0.7)' : 'transparent', p: 1, borderRadius: 1 }}>
                <Typography sx={{ fontWeight: policy === 'overlap' ? 700 : 400 }}>중복 허용 (모두 적용)</Typography>
                <Switch checked={policy === 'overlap'} onChange={() => setPolicy('overlap')} color="primary" />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>새 이벤트 생성</Typography>
            <Button variant="contained" startIcon={<SaveAlt />} onClick={handleSaveAll} sx={{ borderRadius: 2, fontWeight: 700 }}>
              전체 저장하기
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="이벤트 이름 (예: 조조할인)" size="small" value={ruleName} onChange={e => setRuleName(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>발동 조건 (Conditions)</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', bgcolor: '#f8fafc', p: 2, borderRadius: 2 }}>
                <TimePicker label="시작 시간" value={condTimeStart} onChange={(newValue) => setCondTimeStart(newValue)} slotProps={{ textField: { size: 'small' } }} />
                <TimePicker label="종료 시간" value={condTimeEnd} onChange={(newValue) => setCondTimeEnd(newValue)} slotProps={{ textField: { size: 'small' } }} />
                <TextField size="small" label="권종 (예: 시간권)" value={condTicket} onChange={e => setCondTicket(e.target.value)} />
                <TextField size="small" type="number" label="최소 시간" value={condMinHours} onChange={e => setCondMinHours(e.target.value === '' ? '' : Number(e.target.value))} />
                <Box sx={{ width: '100%', display: 'flex', gap: 1, mt: 1 }}>
                  {DAYS.map(day => (
                    <Chip key={day} label={day} onClick={() => toggleDay(day)} color={condDays.includes(day) ? 'primary' : 'default'} variant={condDays.includes(day) ? 'filled' : 'outlined'} />
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>혜택 적용 (Effects)</Typography>
              <Box sx={{ display: 'flex', gap: 2, bgcolor: '#f0fdf4', p: 2, borderRadius: 2 }}>
                <TextField size="small" type="number" label="정액 할인(원)" value={effDiscountAmount} onChange={e => setEffDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                <TextField size="small" type="number" label="정률 할인(%)" value={effDiscountPercent} onChange={e => setEffDiscountPercent(e.target.value === '' ? '' : Number(e.target.value))} />
                <TextField size="small" type="number" label="보너스 추가(분)" value={effBonusMin} onChange={e => setEffBonusMin(e.target.value === '' ? '' : Number(e.target.value))} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button fullWidth variant="outlined" color="primary" onClick={handleAddRule} sx={{ mt: 1, fontWeight: 700 }}>+ 이벤트 규칙 리스트에 추가</Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>등록된 이벤트 규칙</Typography>
          {rules.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>등록된 이벤트가 없습니다.</Typography>
          ) : (
            <List>
              {rules.map(rule => (
                <ListItem key={rule.id} sx={{ bgcolor: rule.is_active ? '#f8fafc' : '#f1f5f9', mb: 1, borderRadius: 2, border: '1px solid #e2e8f0', opacity: rule.is_active ? 1 : 0.6 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800 }}>{rule.name}</Typography>
                        {rule.is_active ? <Chip label="ON" size="small" color="success" /> : <Chip label="OFF" size="small" />}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          <b>조건:</b> {rule.conditions.time_range_start && rule.conditions.time_range_end ? `[${rule.conditions.time_range_start}~${rule.conditions.time_range_end}]` : ''} {rule.conditions.days_of_week.length > 0 ? `[${rule.conditions.days_of_week.join(',')}]` : ''} {rule.conditions.ticket_type ? `[${rule.conditions.ticket_type}]` : ''} {rule.conditions.min_duration_hours ? `[최소 ${rule.conditions.min_duration_hours}h]` : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>
                          <b>혜택:</b> {rule.effects.discount_amount > 0 ? `-${rule.effects.discount_amount}원 ` : ''}{rule.effects.discount_percent > 0 ? `-${rule.effects.discount_percent}% ` : ''}{rule.effects.bonus_minutes > 0 ? `+${rule.effects.bonus_minutes}분` : ''}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Switch checked={rule.is_active} onChange={() => handleToggleRule(rule.id)} color="success" />
                    <IconButton color="error" onClick={() => handleDeleteRule(rule.id)}>
                      <DeleteOutlined />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
