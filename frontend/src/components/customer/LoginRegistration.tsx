
import { Card, Typography, Box, TextField, Button } from '@mui/material';
import { Timer } from '@mui/icons-material';
import { useUserContext } from '../../contexts/UserContext';
import { useAppContext } from '../../contexts/AppContext';
import CustomerDrawer from './CustomerDrawer';

interface LoginRegistrationProps {
  isLoginMode: boolean;
  setIsLoginMode: (mode: boolean) => void;
  isVerified: boolean;
  setIsVerified: (verified: boolean) => void;
  handleRestoreSession: () => void;
  handlePhoneChange: (e: any) => void;
  handleSendCustomerMessage: (message: string) => void;
}

export default function LoginRegistration({
  isLoginMode,
  setIsLoginMode,
  isVerified,
  setIsVerified,
  handleRestoreSession,
  handlePhoneChange,
  handleSendCustomerMessage
}: LoginRegistrationProps) {
  const { setOpenDrawer } = useAppContext();
  const { userName, setUserName, phoneNumber, password, setPassword, jumin, setJumin } = useUserContext();

  return (
    <Card sx={{ bgcolor: '#ffffff', color: '#0f172a', borderRadius: 4, border: '1px solid #cbd5e1', p: 4, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
      <CustomerDrawer handleSendCustomerMessage={handleSendCustomerMessage} />
      <Timer sx={{ fontSize: 56, color: '#10b981', mb: 1.5 }} />

      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
        {isLoginMode ? '로그인' : '회원가입 (최초 1회)'}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2, lineHeight: 1.5, fontWeight: 700 }}>
        {isLoginMode 
          ? '휴대폰 번호와 비밀번호를 입력하여 로그인해 주십시오.' 
          : '이름, 생년월일, 휴대폰 번호를 통해 실명인증을 진행해 주십시오.'}
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3.5, textAlign: 'left' }}>
        {!isLoginMode && (
          <TextField
            fullWidth
            size="small"
            placeholder="이름"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            sx={{ input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
          />
        )}
        {!isLoginMode && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="생년월일 6자리 (YYMMDD)"
              value={jumin}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setJumin(val);
                setIsVerified(false);
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
              sx={{ input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
            />
            <Button 
              variant="contained" 
              color="secondary" 
              onClick={() => {
                if (!userName || jumin.length < 6 || !phoneNumber) {
                  alert('이름, 생년월일(6자리), 휴대폰 번호를 모두 입력해주세요.');
                  return;
                }
                alert('본인 인증이 완료되었습니다.');
                setIsVerified(true);
              }}
              sx={{ minWidth: '90px', borderRadius: 2, fontWeight: 700, fontSize: 13, textTransform: 'none' }}
            >
              실명인증
            </Button>
          </Box>
        )}
        
        <TextField
          fullWidth
          size="small"
          type="tel"
          placeholder="휴대폰 번호 (010-XXXX-XXXX)"
          value={phoneNumber}
          onChange={(e) => {
            handlePhoneChange(e);
            if (!isLoginMode) setIsVerified(false);
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          sx={{ input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ input: { color: '#0f172a', fontWeight: 600, fontSize: 13 }, bgcolor: '#f1f5f9', borderRadius: 2 }}
        />
      </Box>

      {isLoginMode ? (
        <Button
          variant="contained"
          color="success"
          fullWidth
          onClick={() => handleRestoreSession()}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 900, fontSize: 15, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
        >
          로그인
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={!isVerified}
          onClick={() => {
            if (!password) {
              alert('비밀번호를 입력해주세요.');
              return;
            }
            setOpenDrawer(true);
          }}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 900, fontSize: 15, textTransform: 'none' }}
        >
          가입 및 예약하기
        </Button>
      )}

      <Button
        variant="text"
        fullWidth
        onClick={() => {
          setIsLoginMode(!isLoginMode);
          setIsVerified(false);
        }}
        sx={{ mt: 2, color: '#64748b', fontWeight: 700, textTransform: 'none' }}
      >
        {isLoginMode ? '처음이신가요? 회원가입하기' : '이미 계정이 있으신가요? 로그인하기'}
      </Button>
    </Card>
  );
}
