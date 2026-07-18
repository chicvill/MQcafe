import { Box, Typography, Dialog, DialogContent, DialogTitle, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Close } from '@mui/icons-material';

interface TaxInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  storeName: string;
  ceoName: string;
  month: string;
  amount: number;
  vat: number;
  total: number;
}

export default function TaxInvoiceModal({ open, onClose, storeName, ceoName, month, amount, vat, total }: TaxInvoiceModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e3a8a' }}>전자세금계산서 (영수)</Typography>
        <IconButton onClick={onClose} sx={{ color: '#64748b' }}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
        
        {/* 계산서 헤더 */}
        <Box sx={{ border: '2px solid #ef4444', mb: 3 }}>
          <Box sx={{ display: 'flex', borderBottom: '1px solid #ef4444' }}>
            <Box sx={{ flex: 1, borderRight: '1px solid #ef4444', p: 1, textAlign: 'center', bgcolor: '#fef2f2' }}>
              <Typography sx={{ fontWeight: 800, color: '#991b1b' }}>공 급 자</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1, textAlign: 'center', bgcolor: '#eff6ff' }}>
              <Typography sx={{ fontWeight: 800, color: '#1e40af' }}>공급받는자</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex' }}>
            {/* 공급자 정보 */}
            <Box sx={{ flex: 1, borderRight: '1px solid #ef4444' }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#fef2f2', fontWeight: 700, width: '30%', borderBottom: '1px solid #ef4444' }}>등록번호</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ef4444' }}>123-45-67890</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#fef2f2', fontWeight: 700, borderBottom: '1px solid #ef4444' }}>상호</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ef4444' }}>MQcafe 본사</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#fef2f2', fontWeight: 700, borderBottom: 'none' }}>성명</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: 'none' }}>김본사</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            {/* 공급받는자 정보 */}
            <Box sx={{ flex: 1 }}>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#eff6ff', fontWeight: 700, width: '30%', borderBottom: '1px solid #ef4444' }}>등록번호</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ef4444' }}>가맹점 사업자번호</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#eff6ff', fontWeight: 700, borderBottom: '1px solid #ef4444' }}>상호</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: '1px solid #ef4444' }}>{storeName}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ bgcolor: '#eff6ff', fontWeight: 700, borderBottom: 'none' }}>성명</TableCell>
                    <TableCell sx={{ fontWeight: 600, borderBottom: 'none' }}>{ceoName}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Box>

        {/* 작성일자 및 금액 */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, border: '2px solid #e2e8f0' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>작성일자</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>공급가액</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>세액</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>비고</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>{month}-01</TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid #e2e8f0', fontWeight: 600 }}>{amount.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid #e2e8f0', fontWeight: 600 }}>{vat.toLocaleString()}</TableCell>
                <TableCell align="center">정상발행</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* 품목 명세 */}
        <TableContainer component={Paper} variant="outlined" sx={{ border: '2px solid #e2e8f0' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', width: '10%' }}>월/일</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', width: '35%' }}>품목</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', width: '10%' }}>수량</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', width: '15%' }}>단가</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, borderRight: '1px solid #e2e8f0', width: '15%' }}>공급가액</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: '15%' }}>세액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>{month.split('-')[1]}/01</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>{month} 가맹비 (로열티)</TableCell>
                <TableCell align="center" sx={{ borderRight: '1px solid #e2e8f0' }}>1</TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid #e2e8f0' }}>{amount.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid #e2e8f0' }}>{amount.toLocaleString()}</TableCell>
                <TableCell align="right">{vat.toLocaleString()}</TableCell>
              </TableRow>
              {/* 빈 줄 채우기 */}
              <TableRow>
                <TableCell sx={{ borderRight: '1px solid #e2e8f0', py: 2 }}></TableCell>
                <TableCell sx={{ borderRight: '1px solid #e2e8f0' }}></TableCell>
                <TableCell sx={{ borderRight: '1px solid #e2e8f0' }}></TableCell>
                <TableCell sx={{ borderRight: '1px solid #e2e8f0' }}></TableCell>
                <TableCell sx={{ borderRight: '1px solid #e2e8f0' }}></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f1f5f9', p: 2, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 800, color: '#334155' }}>합계금액: {total.toLocaleString()} 원</Typography>
          <Typography sx={{ fontWeight: 700, color: '#ef4444' }}>이 금액을 영수함.</Typography>
        </Box>

      </DialogContent>
    </Dialog>
  );
}
