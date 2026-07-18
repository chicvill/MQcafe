import { Box, Typography, Dialog, DialogContent, DialogTitle, IconButton, Divider } from '@mui/material';
import { Close } from '@mui/icons-material';
import SignaturePad from '../common/SignaturePad';

interface CreateStoreContractModalProps {
  open: boolean;
  onClose: () => void;
  storeName: string;
  ceoName: string;
  onSignAndCreate: (signatureDataUrl: string) => void;
}

export default function CreateStoreContractModal({ open, onClose, storeName, ceoName, onSignAndCreate }: CreateStoreContractModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>신규 가맹점 전자계약 서명</Typography>
        <IconButton onClick={onClose} sx={{ color: '#64748b' }}><Close /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 4, bgcolor: '#ffffff' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#ef4444' }}>
          ※ 매장 개설을 완료하려면 아래 계약 내용에 동의하고 서명해야 합니다.
        </Typography>

        <Box sx={{ border: '1px solid #e2e8f0', p: 3, borderRadius: 2, bgcolor: '#f8fafc', mb: 4, height: 250, overflowY: 'auto' }}>
          <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            본 계약은 MQcafe 본사(이하 "갑"이라 한다)와 {storeName}의 대표자 {ceoName}(이하 "을"이라 한다) 간에 "MQcafe" 가맹점 가입 및 운영에 관한 권리와 의무를 명확히 함을 목적으로 한다.
            {'\n\n'}
            제1조 (목적)
            본 계약은 "갑"이 운영하는 "MQcafe"의 영업표지 및 운영 노하우를 "을"에게 제공하고, "을"은 이를 사용하여 매장을 운영함에 있어 양 당사자 간의 권리와 의무를 규정함을 목적으로 한다.
            {'\n\n'}
            제2조 (가맹점 운영 권한)
            1. "갑"은 "을"에게 "MQcafe" 브랜드 상호, 상표, 서비스표, 영업 노하우, 시스템 이용 권한을 계약 기간 동안 부여한다.
            2. "을"은 계약으로 정해진 장소({storeName})에서만 가맹점을 운영할 수 있으며, 타인에게 영업권을 임의로 양도하거나 대여할 수 없다.
            {'\n\n'}
            제3조 (가맹비 및 로열티)
            1. "을"은 가맹점 가입 및 초기 시스템 세팅 비용으로 가맹비 5,000,000원(VAT 별도)을 "갑"에게 지급한다.
            2. "을"은 "갑"이 제공하는 예약 시스템 및 유지 보수 등의 명목으로 매월 300,000원(VAT 별도)의 로열티를 매월 25일까지 "갑"이 지정한 계좌로 납부하여야 한다.
            {'\n\n'}
            제4조 (계약 기간 및 갱신)
            1. 가맹 계약 기간은 본 계약 체결일(전자서명 완료일)로부터 2년으로 한다.
            2. 계약 만료 60일 전까지 서면으로 해지 의사를 통보하지 않는 한, 본 계약은 동일한 조건으로 1년씩 자동 연장된다.
            {'\n\n'}
            제5조 (매장 관리 및 의무 사항)
            1. "을"은 "갑"의 브랜드 이미지와 가치를 훼손하지 않도록 서비스 품질 및 매장 청결을 유지해야 한다.
            2. "을"은 "갑"이 정한 요금제, 할인 정책, 예약 시스템 정책 등을 성실히 준수하여야 한다.
            3. "갑"은 가맹점의 원활한 운영을 위해 정기적인 시스템 업데이트 및 운영 교육을 제공한다.
            {'\n\n'}
            제6조 (개인정보 수집 및 제공 동의)
            "을"은 매장 개설 및 유지 관리를 위해 "갑"에게 대표자 성명, 연락처, 사업자 등록 정보 등 필수적인 개인정보 및 영업 정보를 제공함에 동의한다.
            {'\n\n'}
            제7조 (계약의 해지)
            1. "을"이 본 계약의 중요한 의무(로열티 3회 이상 미납, 브랜드 훼손, 불법 영업 등)를 위반할 경우, "갑"은 서면 통보 후 계약을 해지할 수 있다.
            2. 계약 해지 시 "을"은 즉시 "MQcafe" 브랜드 관련 상표 및 영업 표지 사용을 중단해야 한다.
            {'\n\n'}
            위 계약 사실을 증명하기 위해 "을"은 본 전자계약서에 직접 서명함으로써 동의를 표하며, 본 서명 완료 시 매장이 공식적으로 개설된다.
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>전자 서명란</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            아래 빈 칸에 마우스나 손가락을 이용하여 직접 싸인하신 후, <b>[서명 완료 및 저장]</b> 버튼을 눌러주세요.
          </Typography>
          
          <SignaturePad onSave={(dataUrl) => onSignAndCreate(dataUrl)} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
