// API 서버 경로 설정
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isLan = typeof window !== 'undefined' && (window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.') || window.location.hostname.startsWith('172.'));
export const API_URL = (isLocal || isLan) ? `http://${window.location.hostname}:8080/api/study-cafe` : `https://${window.location.host}/api/study-cafe`;

// NicePay 결제 설정 — 실제 운영 시 frontend/.env에 VITE_NICEPAY_CLIENT_ID 설정
// 개발자 센터: https://developer.nicepay.co.kr
export const NICEPAY_CLIENT_ID: string = (import.meta as any).env?.VITE_NICEPAY_CLIENT_ID ?? 'R2_TEST_CLIENT_ID';
export const NICEPAY_APPROVE_URL = `${API_URL}/payment/nicepay-approve`;

export const formatMsgTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  } catch (e) {
    return '';
  }
};

export const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone (D5 - clear pitch)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain1.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.4);

    // Second tone (A5 - higher delay pitch)
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime);
      gain2.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.45);
    }, 85);
  } catch (e) {
    console.error('Audio play failed:', e);
  }
};

// 이용권 리스트 정의
export const TIME_TICKET_OPTIONS = [
  { hours: 1, price: 2000, discount: 0 },
  { hours: 2, price: 3500, discount: 13 },
  { hours: 3, price: 5000, discount: 17 },
  { hours: 4, price: 6000, discount: 25 },
  { hours: 5, price: 7000, discount: 30 },
  { hours: 6, price: 8000, discount: 33 },
  { hours: 7, price: 9000, discount: 36 },
  { hours: 8, price: 10000, discount: 38 },
  { hours: 9, price: 11000, discount: 39 },
  { hours: 10, price: 12000, discount: 40 },
];

export const DAY_TICKET_OPTIONS = [
  { days: 1, price: 10000, discount: 0 },
  { days: 2, price: 18000, discount: 10 },
  { days: 3, price: 25000, discount: 17 },
];

export const calculateDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const sDate = new Date(start);
  const eDate = new Date(end);
  const diffTime = eDate.getTime() - sDate.getTime();
  if (diffTime < 0) return 0;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const calculatePeriodPrice = (days: number): number => {
  if (days <= 0) return 0;
  let dailyRate = 6000;
  if (days >= 8 && days <= 14) dailyRate = 5500;
  else if (days >= 15 && days <= 30) dailyRate = 5000;
  else if (days > 30) dailyRate = 4500;
  return days * dailyRate;
};

export const STORES_DETAILS: Record<string, any> = {
  'ST001': {
    id: 'ST001',
    name: 'MQcafe 운정 산내점',
    region: '경기',
    blog: 'https://blog.naver.com/mqnet_unjeong',
    homepage: 'https://mqnet.com/unjeong',
    seats: { free: '40/60', fixed: '1/2', locker: '20/50' },
    hours: {
      '월요일': '24시간',
      '화요일': '24시간',
      '수요일': '24시간',
      '목요일': '24시간',
      '금요일': '24시간',
      '토요일': '24시간',
      '일요일': '24시간'
    },
    holidays: '휴무일 없음',
    business_no: '729-10-02132',
    ceo: '민병훈',
    phone: '031-944-0979',
    email: 'mqnet_sannae@naver.com',
    address: '경기 파주시 청암로17번길 67 (목동동), 엠디프라자 306, 307호 MQcafe 운정 산내점'
  },
  'ST002': {
    id: 'ST002',
    name: 'MQcafe 일산 주엽점',
    region: '경기',
    blog: 'https://blog.naver.com/mqnet_juyeop',
    homepage: 'https://mqnet.com/juyeop',
    seats: { free: '40/60', fixed: '1/2', locker: '20/50' },
    hours: {
      '월요일': '24시간',
      '화요일': '24시간',
      '수요일': '24시간',
      '목요일': '24시간',
      '금요일': '24시간',
      '토요일': '24시간',
      '일요일': '24시간'
    },
    holidays: '매주 셋째주 월요일',
    business_no: '729-10-02133',
    ceo: '홍길동',
    phone: '031-911-0000',
    email: 'mentor_juyeop@naver.com',
    address: '경기 고양시 일산서구 주엽로 81, 4층 MQcafe 일산 주엽점'
  },
  'ST003': {
    id: 'ST003',
    name: 'MQcafe 합정 안내점',
    region: '서울',
    blog: 'https://blog.naver.com/mqnet_hapjeong',
    homepage: 'https://mqnet.com/hapjeong',
    seats: { free: '30/50', fixed: '5/10', locker: '10/30' },
    hours: { '월요일': '24시간', '화요일': '24시간', '수요일': '24시간', '목요일': '24시간', '금요일': '24시간', '토요일': '24시간', '일요일': '24시간' },
    holidays: '연중무휴',
    business_no: '111-22-33333',
    ceo: '김사장',
    phone: '02-123-4567',
    email: 'hapjeong@mqnet.com',
    address: '서울 마포구 합정동 123-45'
  },
  'ST004': {
    id: 'ST004',
    name: 'MQcafe 인천 석남점',
    region: '인천',
    blog: 'https://blog.naver.com/mqnet_seoknam',
    homepage: 'https://mqnet.com/seoknam',
    seats: { free: '20/40', fixed: '0/0', locker: '10/20' },
    hours: { '월요일': '24시간', '화요일': '24시간', '수요일': '24시간', '목요일': '24시간', '금요일': '24시간', '토요일': '24시간', '일요일': '24시간' },
    holidays: '연중무휴',
    business_no: '222-33-44444',
    ceo: '이사장',
    phone: '032-123-4567',
    email: 'seoknam@mqnet.com',
    address: '인천 서구 석남동 123-45'
  },
  'ST005': {
    id: 'ST005',
    name: 'MQcafe 서울 종로점',
    region: '서울',
    blog: 'https://blog.naver.com/mqnet_jongno',
    homepage: 'https://mqnet.com/jongno',
    seats: { free: '50/80', fixed: '10/20', locker: '30/50' },
    hours: { '월요일': '24시간', '화요일': '24시간', '수요일': '24시간', '목요일': '24시간', '금요일': '24시간', '토요일': '24시간', '일요일': '24시간' },
    holidays: '연중무휴',
    business_no: '333-44-55555',
    ceo: '박사장',
    phone: '02-987-6543',
    email: 'jongno@mqnet.com',
    address: '서울 종로구 종로 123-45'
  }
};

export const WS_URL = (isLocal || isLan) ? `ws://${window.location.hostname}:8080/api/study-cafe` : `wss://${window.location.host}/api/study-cafe`;
export const MQTT_BROKER = 'wss://315e5d948dad4a52b84916853d7e9344.s1.eu.hivemq.cloud:8884/mqtt';
export const MQTT_OPTIONS = {
  username: 'situation',
  password: 'M!nkim5053hivemq',
};
