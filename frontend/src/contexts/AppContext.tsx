import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppContextType {
  mode: 'customer' | 'admin' | 'owner' | 'qr_poster';
  setMode: (mode: 'customer' | 'admin' | 'owner' | 'qr_poster') => void;
  
  stores: any[];
  setStores: React.Dispatch<React.SetStateAction<any[]>>;
  
  storeId: string;
  setStoreId: (id: string) => void;
  ownerId: string | null;
  setOwnerId: (id: string | null) => void;
  tempStoreId: string;
  setTempStoreId: (id: string) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  
  openDrawer: boolean;
  setOpenDrawer: (open: boolean) => void;
  ownerDrawerOpen: boolean;
  setOwnerDrawerOpen: (open: boolean) => void;
  customerDrawerOpen: boolean;
  setCustomerDrawerOpen: (open: boolean) => void;
  adminDrawerOpen: boolean;
  setAdminDrawerOpen: (open: boolean) => void;
  isExtensionMode: boolean;
  setIsExtensionMode: (mode: boolean) => void;
  openStoreModal: boolean;
  setOpenStoreModal: (open: boolean) => void;
  openSeatModal: boolean;
  setOpenSeatModal: (open: boolean) => void;
  openPayAppModal: boolean;
  setOpenPayAppModal: (open: boolean) => void;
  
  payAppLoading: boolean;
  setPayAppLoading: (loading: boolean) => void;
  payAppDetails: any;
  setPayAppDetails: (details: any) => void;
  
  seats: any[];
  setSeats: React.Dispatch<React.SetStateAction<any[]>>;
  
  payMethod: 'card' | 'appcard' | 'easypay' | 'mock';
  setPayMethod: (method: 'card' | 'appcard' | 'easypay' | 'mock') => void;
  selectedEasyPay: 'naver' | 'kakao' | 'samsung' | 'toss';
  setSelectedEasyPay: (method: 'naver' | 'kakao' | 'samsung' | 'toss') => void;

  // 무선 단말기 연동
  terminalConnected: boolean;
  setTerminalConnected: (connected: boolean) => void;
  payStep: 'select' | 'waiting' | 'done';
  setPayStep: (step: 'select' | 'waiting' | 'done') => void;
  currentRequestId: string | null;
  setCurrentRequestId: (id: string | null) => void;
  seatMapMode: 'reserve' | 'move';
  setSeatMapMode: (mode: 'reserve' | 'move') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getInitialMode = () => {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/customer')) return 'customer';
  if (path.startsWith('/owner')) return 'owner';

  if (path.startsWith('/qr_poster')) return 'qr_poster';
  // 기본 루트(/)는 어드민(admin)으로 설정
  return 'admin';
};

const getInitialStoreId = () => {
  const params = new URLSearchParams(window.location.search);
  const urlStoreId = params.get('store_id');
  if (urlStoreId) return urlStoreId;
  const saved = localStorage.getItem('stcafe_store_id');
  if (saved) return saved;
  return '';
};

export const AppProvider = ({ children }: { ReactNode?: any, children: ReactNode }) => {
  const [mode, setMode] = useState<'customer' | 'admin' | 'owner' | 'qr_poster'>(getInitialMode());
  const [stores, setStores] = useState<any[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  
  const [storeId, setStoreId] = useState<string>(getInitialStoreId());
  const [tempStoreId, setTempStoreId] = useState<string>(getInitialStoreId());
  const [selectedRegion, setSelectedRegion] = useState<string>('경기');
  
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState<boolean>(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);
  const [adminDrawerOpen, setAdminDrawerOpen] = useState<boolean>(false);
  const [isExtensionMode, setIsExtensionMode] = useState<boolean>(false);
  const [openStoreModal, setOpenStoreModal] = useState<boolean>(false);
  const [openSeatModal, setOpenSeatModal] = useState<boolean>(false);
  const [openPayAppModal, setOpenPayAppModal] = useState<boolean>(false);
  
  const [payAppLoading, setPayAppLoading] = useState<boolean>(false);
  const [payAppDetails, setPayAppDetails] = useState<any>(null);

  const [seats, setSeats] = useState<any[]>([]);

  const [payMethod, setPayMethod] = useState<'card' | 'appcard' | 'easypay' | 'mock'>('card');
  const [selectedEasyPay, setSelectedEasyPay] = useState<'naver' | 'kakao' | 'samsung' | 'toss'>('naver');

  // 무선 단말기 연동 상태
  const [terminalConnected, setTerminalConnected] = useState<boolean>(false);
  const [payStep, setPayStep] = useState<'select' | 'waiting' | 'done'>('select');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [seatMapMode, setSeatMapMode] = useState<'reserve' | 'move'>('reserve');

  return (
    <AppContext.Provider value={{
      mode, setMode,
      stores, setStores,
      ownerId, setOwnerId,
      storeId, setStoreId, tempStoreId, setTempStoreId,
      selectedRegion, setSelectedRegion,
      openDrawer, setOpenDrawer,
      ownerDrawerOpen, setOwnerDrawerOpen,
      customerDrawerOpen, setCustomerDrawerOpen,
      adminDrawerOpen, setAdminDrawerOpen,
      isExtensionMode, setIsExtensionMode,
      openStoreModal, setOpenStoreModal,
      openSeatModal, setOpenSeatModal,
      openPayAppModal, setOpenPayAppModal,
      payAppLoading, setPayAppLoading,
      payAppDetails, setPayAppDetails,
      seats, setSeats,
      payMethod, setPayMethod,
      selectedEasyPay, setSelectedEasyPay,
      terminalConnected, setTerminalConnected,
      payStep, setPayStep,
      currentRequestId, setCurrentRequestId,
      seatMapMode, setSeatMapMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

