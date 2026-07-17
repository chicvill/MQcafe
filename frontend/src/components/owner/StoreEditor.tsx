import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Divider, IconButton, Alert, Select, MenuItem, FormControl } from '@mui/material';
import Grid from '@mui/material/Grid';
import { AddCircleOutlined, DeleteOutlined, SaveAlt, Person } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { API_URL } from '../../utils/constants';
import CreateStoreContractModal from './CreateStoreContractModal';

interface StoreEditorProps {
  fetchStores: () => Promise<void>;
}

export default function StoreEditor({ fetchStores }: StoreEditorProps) {
  const { stores, storeId, setStoreId, ownerId } = useAppContext();
  
  const [ownerInfo, setOwnerInfo] = useState<any>({ name: '', email: '', phone: '' });
  
  const [newStoreName, setNewStoreName] = useState('');
  const [newCeoName, setNewCeoName] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const selectedStore = stores.find(s => s.id === storeId);
  const [editingConfig, setEditingConfig] = useState<any>(selectedStore ? JSON.parse(JSON.stringify(selectedStore.metadata || {})) : null);

  const [selectedSeatType, setSelectedSeatType] = useState<'open' | 'focus' | 'study_room'>('open');
  const [selectedCategory, setSelectedCategory] = useState<'time' | 'day' | 'period'>('time');

  const [contractModalOpen, setContractModalOpen] = useState(false);

  useEffect(() => {
    if (ownerId) {
      fetch(`${API_URL}/owner/${ownerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setOwnerInfo({
              phone: data.owner.phone,
              name: data.owner.metadata?.name || '',
              email: data.owner.metadata?.email || ''
            });
          }
        })
        .catch(console.error);
    }
  }, [ownerId]);

  const handleSelectStore = (id: string) => {
    setStoreId(id);
    const store = stores.find(s => s.id === id);
    if (store) {
      const meta = JSON.parse(JSON.stringify(store.metadata || {}));
      
      // Migrate old ticket_prices structure to new one if needed
      if (meta.ticket_prices && !meta.ticket_prices.open) {
        const oldPrices = { ...meta.ticket_prices };
        meta.ticket_prices = {
          open: oldPrices,
          focus: JSON.parse(JSON.stringify(oldPrices)), // copy old prices to focus as default
          study_room: JSON.parse(JSON.stringify(oldPrices)) // copy old prices to study_room as default
        };
      } else if (meta.ticket_prices && !meta.ticket_prices.study_room) {
        meta.ticket_prices.study_room = JSON.parse(JSON.stringify(meta.ticket_prices.open));
      }
      setEditingConfig(meta);
    }
  };

  const handleCreateStoreClick = () => {
    if (!newStoreName || !newCeoName) return alert('매장명과 대표자명을 입력해주세요.');
    setContractModalOpen(true);
  };

  const executeCreateStore = async (signatureDataUrl: string) => {
    const defaultMeta = {
      business_registration_number: "",
      business_address: "",
      contract_signature: signatureDataUrl, // 계약 서명 데이터 저장
      seat_config: { open: 12, focus: 6, study_room: 2 },
      ticket_prices: {
        open: {
          time: [{ hours: 2, price: 3000 }],
          day: [{ hours: 12, price: 10000 }],
          period: [{ days: 14, price: 60000 }]
        },
        focus: {
          time: [{ hours: 2, price: 4000 }],
          day: [{ hours: 12, price: 12000 }],
          period: [{ days: 14, price: 80000 }]
        },
        study_room: {
          time: [{ hours: 2, price: 6000 }],
          day: [{ hours: 12, price: 20000 }],
          period: [{ days: 14, price: 120000 }]
        }
      }
    };

    try {
      const res = await fetch(`${API_URL}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStoreName, ceo_name: newCeoName, metadata: defaultMeta, owner_id: ownerId })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`매장이 개설되었습니다. (전자계약 서명 완료)\n\n기기 설정(출입문제어설정) 시 필요한 매장 ID는 [${data.store_id}] 입니다.\nwifi 설정 시 이 ID를 꼭 입력해 주세요!`);
        setNewStoreName('');
        setNewCeoName('');
        setContractModalOpen(false);
        fetchStores();
      } else {
        alert('매장 개설 실패');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류');
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedStore || !editingConfig) return;

    // 전자세금계산서 발행을 위한 필수 정보 검증
    if (!editingConfig.business_registration_number) return alert('전자세금계산서 발행을 위해 [사업자 등록 번호]를 반드시 입력해주세요.');
    if (!editingConfig.business_address) return alert('전자세금계산서 발행을 위해 [사업장 주소]를 반드시 입력해주세요.');
    if (!editingConfig.business_condition) return alert('전자세금계산서 발행을 위해 [업태]를 반드시 입력해주세요.');
    if (!editingConfig.business_type) return alert('전자세금계산서 발행을 위해 [종목]을 반드시 입력해주세요.');
    if (!editingConfig.tax_invoice_email) return alert('전자세금계산서 수신을 위해 [세금계산서 수신용 이메일]을 반드시 입력해주세요.');
    try {
      const res = await fetch(`${API_URL}/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedStore.name, 
          ceo_name: selectedStore.ceo_name, 
          metadata: editingConfig 
        })
      });
      if (res.ok) {
        alert('매장 설정이 저장되었습니다.');
        fetchStores();
      } else {
        alert('저장 실패');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류');
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      alert('기존 비밀번호와 새 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (!ownerId) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/owner/${ownerId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('비밀번호가 성공적으로 변경되었습니다.');
        setOldPassword('');
        setNewPassword('');
      } else {
        alert(`비밀번호 변경 실패: ${data.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류');
    }
  };

  const handleSaveOwnerInfo = async () => {
    if (!ownerId) return;
    try {
      const res = await fetch(`${API_URL}/owner/${ownerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ownerInfo.name,
          email: ownerInfo.email
        })
      });
      if (res.ok) {
        alert('점주 정보가 성공적으로 변경되었습니다.');
      } else {
        alert('점주 정보 변경 실패');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류');
    }
  };

  const renderPriceSection = () => {
    if (!editingConfig || !editingConfig.ticket_prices) return null;
    const seatPrices = editingConfig.ticket_prices[selectedSeatType] || { time: [], day: [], period: [] };
    const items = seatPrices[selectedCategory] || [];

    const updatePrice = (index: number, field: string, value: number) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      setEditingConfig({
        ...editingConfig,
        ticket_prices: {
          ...editingConfig.ticket_prices,
          [selectedSeatType]: { ...seatPrices, [selectedCategory]: newItems }
        }
      });
    };

    const addPrice = (defaultItem: any) => {
      const newItems = [...items, defaultItem];
      setEditingConfig({
        ...editingConfig,
        ticket_prices: {
          ...editingConfig.ticket_prices,
          [selectedSeatType]: { ...seatPrices, [selectedCategory]: newItems }
        }
      });
    };

    const removePrice = (index: number) => {
      const newItems = items.filter((_: any, i: number) => i !== index);
      setEditingConfig({
        ...editingConfig,
        ticket_prices: {
          ...editingConfig.ticket_prices,
          [selectedSeatType]: { ...seatPrices, [selectedCategory]: newItems }
        }
      });
    };

    const isPeriod = selectedCategory === 'period';

    return (
      <Box sx={{ mt: 3, p: 3, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl size="small" sx={{ width: 200 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, color: '#64748b' }}>좌석 종류</Typography>
            <Select value={selectedSeatType} onChange={(e) => setSelectedSeatType(e.target.value as 'open'|'focus'|'study_room')} sx={{ bgcolor: 'white' }}>
              <MenuItem value="open">자유석 요금제</MenuItem>
              <MenuItem value="focus">1인 집중석 요금제</MenuItem>
              <MenuItem value="study_room">스터디룸 요금제</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ width: 200 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, color: '#64748b' }}>이용권 종류</Typography>
            <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as 'time'|'day'|'period')} sx={{ bgcolor: 'white' }}>
              <MenuItem value="time">시간권</MenuItem>
              <MenuItem value="day">당일권</MenuItem>
              <MenuItem value="period">기간권</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((t: any, idx: number) => (
            <Box key={`${selectedCategory}-${idx}`} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField 
                size="small" 
                type="number" 
                label={isPeriod ? "일수" : "시간"} 
                value={isPeriod ? t.days || 0 : t.hours || 0} 
                onChange={e => updatePrice(idx, isPeriod ? 'days' : 'hours', parseInt(e.target.value) || 0)} 
                sx={{ width: 200, bgcolor: 'white' }} 
              />
              <TextField 
                size="small" 
                type="number" 
                label="가격(원)" 
                value={t.price || 0} 
                onChange={e => updatePrice(idx, 'price', parseInt(e.target.value) || 0)} 
                sx={{ width: 200, bgcolor: 'white' }} 
              />
              <IconButton color="error" onClick={() => removePrice(idx)}>
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
        
        <Button 
          sx={{ mt: 2 }} 
          startIcon={<AddCircleOutlined />} 
          onClick={() => {
            if (selectedCategory === 'time') addPrice({ hours: 1, price: 1000 });
            else if (selectedCategory === 'day') addPrice({ hours: 12, price: 10000 });
            else addPrice({ days: 14, price: 60000 });
          }}
        >
          해당 요금 추가
        </Button>
      </Box>
    );
  };

  return (
    <Grid container spacing={4}>
      {/* Left Sidebar: Store List & Creation */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>새로운 매장 개설</Typography>
          <TextField fullWidth label="매장명 (예: MQcafe 3호점)" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="대표자명" value={newCeoName} onChange={e => setNewCeoName(e.target.value)} sx={{ mb: 2 }} />
          <Button variant="contained" size="large" onClick={handleCreateStoreClick} sx={{ fontWeight: 700, borderRadius: 2 }}>
            새 매장 개설
          </Button>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>내 매장 목록</Typography>
          {stores.map(store => (
            <Box 
              key={store.id} 
              onClick={() => handleSelectStore(store.id)}
              sx={{ 
                p: 2, mb: 1, borderRadius: 2, cursor: 'pointer',
                border: store.id === storeId ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                bgcolor: store.id === storeId ? '#eff6ff' : '#ffffff'
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{store.name}</Typography>
              <Typography variant="caption" color="textSecondary">대표: {store.ceo_name}</Typography>
            </Box>
          ))}
        </Paper>
      </Grid>

      {/* Right Area: Store Config Editor */}
      <Grid size={{ xs: 12, md: 8 }}>
        
        {/* 점주 공통 설정 */}
        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}><Person /> 점주 개인 정보 (공통)</Typography>
            <Button variant="contained" color="primary" onClick={handleSaveOwnerInfo} startIcon={<SaveAlt />}>정보 저장</Button>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField 
                fullWidth label="점주 성명" 
                value={ownerInfo.name} 
                onChange={e => setOwnerInfo({...ownerInfo, name: e.target.value})} 
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField 
                fullWidth label="휴대폰 번호 (수정 불가)" 
                disabled
                value={ownerInfo.phone} 
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                fullWidth label="이메일 주소" 
                value={ownerInfo.email} 
                onChange={e => setOwnerInfo({...ownerInfo, email: e.target.value})} 
              />
            </Grid>
          </Grid>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 4, mb: 2, color: '#ef4444' }}>비밀번호 변경</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <TextField 
                fullWidth label="기존 비밀번호" type="password" 
                value={oldPassword} onChange={e => setOldPassword(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField 
                fullWidth label="새 비밀번호" type="password" 
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Button fullWidth variant="outlined" color="error" sx={{ height: '100%' }} onClick={handlePasswordChange}>
                비밀번호 변경 적용
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {editingConfig ? (
          <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>[{selectedStore?.name}] 매장 상세 설정</Typography>
              <Button variant="contained" color="success" onClick={handleSaveConfig} startIcon={<SaveAlt />}>저장하기</Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>1. 사업자 및 정산 정보</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="정산 은행명" 
                  value={editingConfig.bank_info?.bank_name || ''} 
                  onChange={e => setEditingConfig({...editingConfig, bank_info: {...editingConfig.bank_info, bank_name: e.target.value}})} 
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="정산 계좌번호" 
                  value={editingConfig.bank_info?.bank_account || ''} 
                  onChange={e => setEditingConfig({...editingConfig, bank_info: {...editingConfig.bank_info, bank_account: e.target.value}})} 
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="사업자 등록 번호" 
                  value={editingConfig.business_registration_number || ''} 
                  onChange={e => setEditingConfig({...editingConfig, business_registration_number: e.target.value})} 
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="사업장 주소" 
                  value={editingConfig.business_address || ''} 
                  onChange={e => setEditingConfig({...editingConfig, business_address: e.target.value})} 
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="업태 (예: 숙박 및 음식점업)" 
                  value={editingConfig.business_condition || ''} 
                  onChange={e => setEditingConfig({...editingConfig, business_condition: e.target.value})} 
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  fullWidth label="종목 (예: 휴게음식점, 커피전문점)" 
                  value={editingConfig.business_type || ''} 
                  onChange={e => setEditingConfig({...editingConfig, business_type: e.target.value})} 
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth label="세금계산서 수신용 이메일" 
                  type="email"
                  value={editingConfig.tax_invoice_email || ''} 
                  onChange={e => setEditingConfig({...editingConfig, tax_invoice_email: e.target.value})} 
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>2. 좌석 구성 설정</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>매장의 좌석 개수를 변경하면 즉시 고객 모드의 좌석 배치도에 반영됩니다.</Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>
                <TextField 
                  type="number" fullWidth label="자유석 (Open) 수" 
                  value={editingConfig.seat_config?.open || 0} 
                  onChange={e => setEditingConfig({
                    ...editingConfig, 
                    seat_config: { ...editingConfig.seat_config, open: parseInt(e.target.value) || 0 }
                  })} 
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField 
                  type="number" fullWidth label="1인 집중석 (Focus) 수" 
                  value={editingConfig.seat_config?.focus || 0} 
                  onChange={e => setEditingConfig({
                    ...editingConfig, 
                    seat_config: { ...editingConfig.seat_config, focus: parseInt(e.target.value) || 0 }
                  })} 
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <TextField 
                  type="number" fullWidth label="스터디룸 수" 
                  value={editingConfig.seat_config?.study_room || 0} 
                  onChange={e => setEditingConfig({
                    ...editingConfig, 
                    seat_config: { ...editingConfig.seat_config, study_room: parseInt(e.target.value) || 0 }
                  })} 
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>3. 이용권 요금 설정</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>좌석 종류와 이용권 종류를 선택하고, 세부 요금을 추가해 보세요.</Alert>
            
            {renderPriceSection()}
          </Paper>
        ) : (
          <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <Typography color="textSecondary" sx={{ py: 10 }}>좌측에서 매장을 선택해주세요.</Typography>
          </Paper>
        )}
      </Grid>

      {contractModalOpen && (
        <CreateStoreContractModal
          open={contractModalOpen}
          onClose={() => setContractModalOpen(false)}
          storeName={newStoreName}
          ceoName={newCeoName}
          onSignAndCreate={executeCreateStore}
        />
      )}
    </Grid>
  );
}
