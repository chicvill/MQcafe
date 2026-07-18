import { createContext, useContext, useState, type ReactNode } from 'react';
import { useAppContext } from './AppContext';
import { calculateDays } from '../utils/constants';

export const getLocalISOString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

interface UserContextType {
  userName: string;
  setUserName: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  
  ticketCategory: 'time' | 'day' | 'period';
  setTicketCategory: (cat: 'time' | 'day' | 'period') => void;
  selectedTimeHours: number;
  setSelectedTimeHours: (hours: number) => void;
  selectedDayDays: number;
  setSelectedDayDays: (days: number) => void;
  periodStartDate: string;
  setPeriodStartDate: (date: string) => void;
  periodEndDate: string;
  setPeriodEndDate: (date: string) => void;
  
  entryDateTime: string;
  setEntryDateTime: (dt: string) => void;
  exitDateTime: string;
  setExitDateTime: (dt: string) => void;
  
  useLocker: boolean;
  setUseLocker: (val: boolean) => void;
  seatType: 'open' | 'focus';
  setSeatType: (val: 'open' | 'focus') => void;
  
  activeSession: any;
  setActiveSession: (session: any) => void;
  pinCode: string;
  setPinCode: (pin: string) => void;

  tableId: string;
  setTableId: (id: string) => void;
  password: string;
  setPassword: (password: string) => void;
  jumin: string;
  setJumin: (jumin: string) => void;

  getCalculatedPrice: () => number;
  ticketPrices: any;
  lockerPrices: any;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { stores, storeId } = useAppContext();
  const currentStore = stores.find(s => s.id === storeId);
  const ticketPrices = currentStore?.metadata?.ticket_prices || {
    open: {
      time: [{ hours: 2, price: 3000 }, { hours: 4, price: 5000 }, { hours: 6, price: 7000 }, { hours: 12, price: 10000 }],
      day: [{ hours: 12, price: 10000 }],
      period: [{ days: 14, price: 60000 }, { days: 28, price: 110000 }]
    },
    focus: {
      time: [{ hours: 2, price: 4000 }, { hours: 4, price: 6000 }, { hours: 6, price: 8000 }, { hours: 12, price: 12000 }],
      day: [{ hours: 12, price: 12000 }],
      period: [{ days: 14, price: 80000 }, { days: 28, price: 150000 }]
    }
  };
  const lockerPrices = currentStore?.metadata?.locker_prices || {
    day: 2000,
    periodPerDay: 1500
  };

  const [userName, setUserName] = useState(() => localStorage.getItem('mqcafe_user_name') || '');
  const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem('mqcafe_phone_number') || '');
  const [ticketCategory, setTicketCategory] = useState<'time' | 'day' | 'period'>('time');
  const [selectedTimeHours, setSelectedTimeHours] = useState<number>(2);
  const [selectedDayDays, setSelectedDayDays] = useState<number>(1);
  const [periodStartDate, setPeriodStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [periodEndDate, setPeriodEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });
  
  const [entryDateTime, setEntryDateTime] = useState<string>(() => getLocalISOString(new Date()));
  const [exitDateTime, setExitDateTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return getLocalISOString(d);
  });
  
  const [activeSession, setActiveSession] = useState<any>(null);
  const [pinCode, setPinCode] = useState<string>('');
  const [tableId, setTableId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [jumin, setJumin] = useState('');
  const [useLocker, setUseLocker] = useState<boolean>(false);
  const [seatType, setSeatType] = useState<'open' | 'focus'>('open');

  const getCalculatedPrice = () => {
    let basePrice = 0;
    let lockerPrice = 0;
    
    // Ensure we safely fallback to open if ticketPrices is malformed or migrating
    const pricesForType = ticketPrices[seatType] || ticketPrices.open || ticketPrices;

    if (ticketCategory === 'time') {
      const option = pricesForType.time?.find((t: any) => t.hours === selectedTimeHours);
      basePrice = option ? option.price : selectedTimeHours * 1500;
    } else if (ticketCategory === 'day') {
      const option = pricesForType.day?.find((t: any) => t.hours === (selectedDayDays * 24) || t.hours === 12);
      basePrice = option ? option.price : selectedDayDays * 10000;
      if (useLocker) lockerPrice = lockerPrices.day;
    } else if (ticketCategory === 'period') {
      const days = calculateDays(periodStartDate, periodEndDate);
      const option = pricesForType.period?.find((t: any) => t.days === days);
      basePrice = option ? option.price : days * 5000;
      if (useLocker) lockerPrice = lockerPrices.periodPerDay * days;
    }
    return basePrice + lockerPrice;
  };

  return (
    <UserContext.Provider value={{
      userName, setUserName, phoneNumber, setPhoneNumber,
      ticketCategory, setTicketCategory, selectedTimeHours, setSelectedTimeHours,
      selectedDayDays, setSelectedDayDays, periodStartDate, setPeriodStartDate,
      periodEndDate, setPeriodEndDate,
      entryDateTime, setEntryDateTime, exitDateTime, setExitDateTime,
      useLocker, setUseLocker, seatType, setSeatType,
      activeSession, setActiveSession, pinCode, setPinCode,
      tableId, setTableId, password, setPassword, jumin, setJumin, 
      getCalculatedPrice, ticketPrices, lockerPrices
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
