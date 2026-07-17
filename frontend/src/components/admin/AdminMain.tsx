import { useState, useMemo } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Container, Select, MenuItem, FormControl, InputLabel, Card, CardContent } from '@mui/material';

import Grid from '@mui/material/Grid';
import { useAppContext } from '../../contexts/AppContext';
import AdminDrawer from './AdminDrawer';
import TaxInvoiceModal from './TaxInvoiceModal';

export default function AdminMain() {
  const { stores } = useAppContext();
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');

  // 전체 요약 (Global Summary) 상태
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedGlobalMonth, setSelectedGlobalMonth] = useState(currentMonthStr); 

  // 가맹점별 상세 (Store Detail) 상태
  const currentYear = new Date().getFullYear().toString();
  const [startMonth, setStartMonth] = useState(`${currentYear}-01`);
  const [endMonth, setEndMonth] = useState(`${currentYear}-12`);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // 계산서 모달 상태
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{storeName: string, ceoName: string, month: string} | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'admin' && adminPw === '1212') {
      setIsAdminLoggedIn(true);
      if (stores.length > 0) {
        setSelectedStoreId(stores[0].id);
      }
    } else {
      alert('관리자 계정 정보가 일치하지 않습니다.');
    }
  };

  const handleIssueInvoice = (storeName: string, ceoName: string, month: string) => {
    setInvoiceData({ storeName, ceoName, month });
    setInvoiceModalOpen(true);
  };

  // 모의 가맹비 데이터
  const FRANCHISE_FEE_NET = 300000;
  const FRANCHISE_FEE_VAT = 30000;
  const FRANCHISE_FEE_TOTAL = 330000;

  // 전체 수입액 계산: 선택한 월(selectedGlobalMonth)이 현재 월 이하일 때만 수입이 발생했다고 시뮬레이션
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const globalIncome = useMemo(() => {
    if (!selectedGlobalMonth) return 0;
    const [gYear, gMonth] = selectedGlobalMonth.split('-').map(Number);
    const isGlobalPastOrCurrent = gYear < currentYearNum || (gYear === currentYearNum && gMonth <= currentMonthNum);
    return isGlobalPastOrCurrent ? stores.length * FRANCHISE_FEE_TOTAL : 0;
  }, [selectedGlobalMonth, currentYearNum, currentMonthNum, stores.length]);

  // 선택된 매장 객체
  const activeStore = stores.find(s => s.id === selectedStoreId);

  // 시작 연월 ~ 종료 연월 리스트 생성 로직
  const periodData = useMemo(() => {
    if (!activeStore || !startMonth || !endMonth) return null;
    
    const rows = [];
    let periodNet = 0;
    let periodVat = 0;
    let periodTotal = 0;

    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    if (start > end) return { rows: [], periodNet: 0, periodVat: 0, periodTotal: 0 };

    let current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      
      const isPastOrCurrent = monthStr <= currentMonthStr;
      
      const paymentDate = isPastOrCurrent ? `${monthStr}-05` : '-';
      const net = isPastOrCurrent ? FRANCHISE_FEE_NET : 0;
      const vat = isPastOrCurrent ? FRANCHISE_FEE_VAT : 0;
      const total = isPastOrCurrent ? FRANCHISE_FEE_TOTAL : 0;

      periodNet += net;
      periodVat += vat;
      periodTotal += total;

      rows.push({
        year,
        month,
        monthStr,
        paymentDate,
        net,
        vat,
        total,
        isPaid: isPastOrCurrent
      });

      current.setMonth(current.getMonth() + 1);
    }

    return { rows, periodNet, periodVat, periodTotal };
  }, [activeStore, startMonth, endMonth, currentMonthStr]);

  if (!isAdminLoggedIn) {
    return (
      <Container maxWidth="xs" sx={{ mt: 10 }}>
        <Paper sx={{ p: 4, borderRadius: 4, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>본사 관리자 시스템</Typography>
          <Typography variant="caption" sx={{ color: '#64748b', mb: 4, display: 'block' }}>최고 관리자 전용 로그인</Typography>
          <form onSubmit={handleAdminLogin}>
            <TextField fullWidth label="관리자 ID" variant="outlined" sx={{ mb: 2 }} value={adminId} onChange={e => setAdminId(e.target.value)} />
            <TextField fullWidth label="비밀번호" type="password" variant="outlined" sx={{ mb: 3 }} value={adminPw} onChange={e => setAdminPw(e.target.value)} />
            <Button fullWidth type="submit" variant="contained" color="secondary" size="large" sx={{ borderRadius: 2, fontWeight: 700 }}>로그인</Button>
          </form>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ mt: 4, px: 4 }}>
      <AdminDrawer onLogout={() => setIsAdminLoggedIn(false)} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>본사 어드민 대시보드</Typography>
      </Box>

      {/* 1. 상단: 년월 선택 및 전체 수입액 */}
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#334155' }}>본사 월간 수입(가맹비) 합계</Typography>
        <Grid container spacing={4} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              label="조회 연월"
              type="month" 
              fullWidth 
              value={selectedGlobalMonth} 
              onChange={e => setSelectedGlobalMonth(e.target.value)}
              sx={{ bgcolor: 'white' }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe', boxShadow: 'none' }}>
              <CardContent sx={{ py: 2, px: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1d4ed8' }}>
                  {globalIncome.toLocaleString()} 원
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. 중/하단: 가맹점별 납부현황 */}
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: '#334155' }}>가맹점별 납부 현황</Typography>
        
        {/* 필터 영역 */}
        <Grid container spacing={3} sx={{ mb: 4, alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField 
              label="시작 연월"
              type="month" 
              fullWidth 
              value={startMonth} 
              onChange={e => setStartMonth(e.target.value)}
              sx={{ bgcolor: 'white' }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField 
              label="종료 연월"
              type="month" 
              fullWidth 
              value={endMonth} 
              onChange={e => setEndMonth(e.target.value)}
              sx={{ bgcolor: 'white' }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>가맹점 선택</InputLabel>
              <Select
                value={selectedStoreId}
                label="가맹점 선택"
                onChange={e => setSelectedStoreId(e.target.value)}
                sx={{ bgcolor: 'white' }}
              >
                {stores.map(store => (
                  <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* 가맹점 정보 표시 영역 */}
        {activeStore ? (
          <Box sx={{ mb: 4, p: 3, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>매장 명칭</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>{activeStore.name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>점주명 (대표자)</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>{activeStore.ceo_name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>가맹점 전화번호</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>010-0000-0000</Typography>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box sx={{ mb: 4, p: 3, bgcolor: '#f1f5f9', borderRadius: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">가맹점을 선택해주세요.</Typography>
          </Box>
        )}

        {/* 연간 리스트업 테이블 */}
        {activeStore && (
          <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 700, py: 1.5 }}>월</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>수납일</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>가맹비 (공급가액)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>부가세액</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>합계</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodData?.rows.map((row: any) => (
                  <TableRow key={row.monthStr} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{row.monthStr}</TableCell>
                    <TableCell align="center">{row.paymentDate}</TableCell>
                    <TableCell align="right">{row.net.toLocaleString()} 원</TableCell>
                    <TableCell align="right">{row.vat.toLocaleString()} 원</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: row.isPaid ? '#0f172a' : '#94a3b8' }}>
                      {row.total.toLocaleString()} 원
                    </TableCell>
                    <TableCell align="center">
                      {row.isPaid ? (
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="primary"
                          onClick={() => handleIssueInvoice(activeStore.name, activeStore.ceo_name, row.monthStr)}
                        >
                          세금계산서 발행
                        </Button>
                      ) : (
                        <Typography variant="caption" color="textSecondary">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* 기간 합계 */}
                <TableRow sx={{ bgcolor: '#eff6ff' }}>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: 900, color: '#1e40af', py: 2 }}>조회 기간 합계</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#1e40af' }}>{periodData?.periodNet.toLocaleString()} 원</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#1e40af' }}>{periodData?.periodVat.toLocaleString()} 원</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: '#1d4ed8', fontSize: '1.1rem' }}>{periodData?.periodTotal.toLocaleString()} 원</TableCell>
                  <TableCell align="center"></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* 세금계산서 모달 */}
      {invoiceData && (
        <TaxInvoiceModal
          open={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          storeName={invoiceData.storeName}
          ceoName={invoiceData.ceoName}
          month={invoiceData.month}
          amount={FRANCHISE_FEE_NET}
          vat={FRANCHISE_FEE_VAT}
          total={FRANCHISE_FEE_TOTAL}
        />
      )}
    </Box>
  );
}
