import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import Grid from '@mui/material/Grid';
import { AddCircleOutlined, DeleteOutlined, SaveAlt, Settings } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { API_URL } from '../../utils/constants';

const DEFAULT_EXPENSE_CATEGORIES = ['매장 임차료', '관리비', '전기료', '수도료', '대출 이자', '시설 개선비', '수리비', '이전 비축금', '보험료', '소모품비', '기타 지출'];

interface AccountBookProps {
  fetchStores: () => Promise<void>;
}

export default function AccountBook({ fetchStores }: AccountBookProps) {
  const { stores, storeId, setStoreId } = useAppContext();
  const selectedStore = stores.find(s => s.id === storeId);
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  useEffect(() => {
    if (selectedStore) {
      setExpenses(selectedStore.metadata?.expenses || []);
      setCategories(selectedStore.metadata?.expense_categories || DEFAULT_EXPENSE_CATEGORIES);
      fetchRevenue();
    }
  }, [selectedStore]);

  const fetchRevenue = async () => {
    if (!selectedStore) return;
    const currentMonth = new Date().toISOString().substring(0, 7);
    try {
      const res = await fetch(`${API_URL}/admin/revenue?store_id=${selectedStore.id}&month=${currentMonth}`);
      if (res.ok) {
        const data = await res.json();
        setEstimatedRevenue(data.revenue || 0);
      }
    } catch (e) {
      console.error('Failed to fetch revenue', e);
    }
  };

  const handleAddExpense = () => {
    setExpenses([...expenses, { id: Date.now().toString(), category: categories[0] || '', date: new Date().toISOString().split('T')[0], amount: 0 }]);
  };

  const handleUpdateExpense = (index: number, field: string, value: any) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setExpenses(newExpenses);
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedStore) return;
    try {
      const res = await fetch(`${API_URL}/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedStore.name, 
          ceo_name: selectedStore.ceo_name, 
          metadata: { ...selectedStore.metadata, expenses, expense_categories: categories } 
        })
      });
      if (res.ok) {
        alert('가계부 내역이 저장되었습니다.');
        fetchStores();
      } else {
        alert('저장 실패');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류');
    }
  };

  const handleSaveCategories = async (newCats: string[]) => {
    if (!selectedStore) return;
    try {
      const res = await fetch(`${API_URL}/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedStore.name, 
          ceo_name: selectedStore.ceo_name, 
          metadata: { ...selectedStore.metadata, expenses, expense_categories: newCats } 
        })
      });
      if (res.ok) {
        setCategories(newCats);
        fetchStores();
      }
    } catch (e) {
      console.error(e);
      alert('카테고리 저장 오류');
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      alert('이미 존재하는 항목입니다.');
      return;
    }
    const newCats = [...categories, newCategoryName.trim()];
    setNewCategoryName('');
    handleSaveCategories(newCats);
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (expenses.some(e => e.category === catToRemove)) {
      alert('해당 항목으로 등록된 지출 내역이 있어 삭제할 수 없습니다. 지출 내역을 먼저 삭제하거나 수정해주세요.');
      return;
    }
    const newCats = categories.filter(c => c !== catToRemove);
    handleSaveCategories(newCats);
  };

  // 계산 로직 (이번 달 기준)
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const thisMonthExpenses = expenses.filter(e => e.date?.startsWith(currentMonth));
  const totalExpense = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const netProfit = estimatedRevenue - totalExpense;

  return (
    <Grid container spacing={4}>
      {/* 왼쪽: 매장 선택 및 요약 */}
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

        <Card sx={{ bgcolor: '#eff6ff', borderRadius: 3, border: '1px solid #bfdbfe', mb: 2 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>이번 달 예상 매출</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e40af' }}>{estimatedRevenue.toLocaleString()} 원</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ bgcolor: '#fef2f2', borderRadius: 3, border: '1px solid #fecaca', mb: 2 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>이번 달 지출 내역</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#991b1b' }}>{totalExpense.toLocaleString()} 원</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ bgcolor: '#f0fdf4', borderRadius: 3, border: '1px solid #bbf7d0' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>순이익</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#166534' }}>{netProfit.toLocaleString()} 원</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* 오른쪽: 상세 지출 내역 입력 */}
      <Grid size={{ xs: 12, md: 8 }}>
        {selectedStore ? (
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>상세 지출 내역 등록</Typography>
              <Box>
                <Button variant="outlined" startIcon={<Settings />} onClick={() => setOpenCategoryModal(true)} sx={{ borderRadius: 2, fontWeight: 700, mr: 1 }}>
                  항목 편집
                </Button>
                <Button variant="contained" startIcon={<SaveAlt />} onClick={handleSave} sx={{ borderRadius: 2, fontWeight: 700 }}>
                  저장하기
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {expenses.map((exp, idx) => (
                <Box key={exp.id || idx} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <FormControl size="small" sx={{ width: 160, bgcolor: 'white' }}>
                    <Select value={exp.category || ''} onChange={e => handleUpdateExpense(idx, 'category', e.target.value)}>
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    type="date"
                    value={exp.date || ''}
                    onChange={e => handleUpdateExpense(idx, 'date', e.target.value)}
                    sx={{ width: 150, bgcolor: 'white' }}
                  />

                  <TextField
                    size="small"
                    type="number"
                    label="금액(원)"
                    value={exp.amount === 0 ? '' : exp.amount}
                    onChange={e => handleUpdateExpense(idx, 'amount', Number(e.target.value))}
                    sx={{ flex: 1, bgcolor: 'white' }}
                  />
                  
                  <IconButton color="error" onClick={() => handleRemoveExpense(idx)}>
                    <DeleteOutlined />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button 
              variant="outlined" 
              startIcon={<AddCircleOutlined />} 
              onClick={handleAddExpense} 
              sx={{ mt: 3, borderRadius: 2, borderStyle: 'dashed', borderWidth: 2 }} 
              fullWidth
            >
              지출 내역 추가
            </Button>
          </Paper>
        ) : (
          <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography color="textSecondary" sx={{ py: 10 }}>좌측에서 매장을 선택해주세요.</Typography>
          </Paper>
        )}
      </Grid>

      {/* 카테고리 편집 모달 */}
      <Dialog open={openCategoryModal} onClose={() => setOpenCategoryModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>지출 항목 편집</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField 
              fullWidth 
              size="small" 
              placeholder="새 항목 이름 입력" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
            />
            <Button variant="contained" onClick={handleAddCategory}>추가</Button>
          </Box>
          <List sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            {categories.map(cat => (
              <ListItem 
                key={cat} 
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleRemoveCategory(cat)}>
                    <DeleteOutlined />
                  </IconButton>
                }
              >
                <ListItemText primary={cat} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryModal(false)} sx={{ fontWeight: 700 }}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
