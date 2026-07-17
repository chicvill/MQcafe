import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, Divider, Paper } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useAppContext } from '../../contexts/AppContext';
import { STORES_DETAILS } from '../../utils/constants';

export default function StoreSelector() {
  const { 
    storeId, 
    setStoreId, 
    tempStoreId, 
    setTempStoreId, 
    selectedRegion, 
    setSelectedRegion, 
    openStoreModal, 
    setOpenStoreModal 
  } = useAppContext();

  return (
    <Dialog 
      open={openStoreModal} 
      onClose={() => {
        if (storeId) {
          setOpenStoreModal(false);
        } else {
          alert('서비스 이용을 위해 매장을 먼저 선택해 주셔야 합니다.');
        }
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#ffffff',
            color: '#0f172a',
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, textAlign: 'center', borderBottom: '1px solid #e2e8f0', py: 2 }}>
        매장선택
      </DialogTitle>
      <DialogContent sx={{ p: 3, maxHeight: '70vh', overflowY: 'auto' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, textAlign: 'center' }}>
          이용하실 매장을 선택해주세요
        </Typography>

        {/* 지역 선택 dropdown */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block', color: '#475569' }}>지역</Typography>
          <Select
            fullWidth
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              const firstStore = Object.values(STORES_DETAILS).find(s => s.region === e.target.value);
              if (firstStore) {
                setTempStoreId(firstStore.id);
              }
            }}
            size="small"
            sx={{ borderRadius: 2, bgcolor: '#f8fafc', '.MuiSelect-select': { py: 1, fontWeight: 700 } }}
          >
            <MenuItem value="경기">경기</MenuItem>
          </Select>
        </Box>

        {/* 매장 선택 dropdown */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block', color: '#475569' }}>이용하실 매장</Typography>
          <Select
            fullWidth
            value={tempStoreId}
            onChange={(e) => setTempStoreId(e.target.value)}
            size="small"
            sx={{ borderRadius: 2, bgcolor: '#f8fafc', '.MuiSelect-select': { py: 1, fontWeight: 700 } }}
          >
            {Object.values(STORES_DETAILS)
              .filter(s => s.region === selectedRegion)
              .map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name.replace('MQcafe ', '')}</MenuItem>
              ))
            }
          </Select>
        </Box>

        {/* 매장 상세 정보 패널 */}
        {(() => {
          const selectedStore = STORES_DETAILS[tempStoreId] || STORES_DETAILS['ST001'];
          return (
            <Box>
              <Box 
                component="img" 
                src="/study_cafe_interior.png" 
                alt="Study Cafe Interior" 
                sx={{ width: '100%', borderRadius: 3, mb: 2, height: '180px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
              />

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, display: 'block' }}>블로그</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  <a href={selectedStore.blog} target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'underline' }}>
                    {selectedStore.blog}
                  </a>
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800, display: 'block' }}>홈페이지</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  <a href={selectedStore.homepage} target="_blank" rel="noreferrer" style={{ color: '#047857', textDecoration: 'underline' }}>
                    {selectedStore.homepage}
                  </a>
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5, color: '#475569' }}>이용 가능 좌석</Typography>
                <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>{selectedStore.seats.free}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>자유석</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>{selectedStore.seats.fixed}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>고정석</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>{selectedStore.seats.locker}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>사물함</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, color: '#475569' }}>운영시간</Typography>
                <Paper sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                  {Object.entries(selectedStore.hours).map(([day, hr]: any) => (
                    <Box key={day} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: day === '목요일' ? '#10b981' : '#475569' }}>{day}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>{hr}</Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, color: '#475569' }}>이달의 휴무</Typography>
                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3, fontWeight: 800, fontSize: 12, color: '#475569' }}>
                  {selectedStore.holidays}
                </Paper>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, color: '#475569' }}>사업자 정보</Typography>
                <Paper sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#475569' }}>사업자: {selectedStore.ceo}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#475569' }}>사업자등록번호: {selectedStore.business_no}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#475569' }}>연락처: {selectedStore.phone}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#475569' }}>이메일: {selectedStore.email}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475569' }}>주소: {selectedStore.address}</Typography>
                </Paper>
              </Box>
            </Box>
          );
        })()}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, borderTop: '1px solid #e2e8f0' }}>
        <Button 
          variant="contained" 
          color="success" 
          fullWidth
          size="large"
          onClick={() => {
            setStoreId(tempStoreId);
            setOpenStoreModal(false);
          }}
          sx={{ borderRadius: 3, fontWeight: 900, py: 1.5, fontSize: 16 }}
        >
          {STORES_DETAILS[tempStoreId]?.name?.replace('MQcafe ', '')} 매장 선택하기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

