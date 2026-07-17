import { createContext, useContext, useState, type ReactNode } from 'react';

interface ChatContextType {
  ws: WebSocket | null;
  setWs: (ws: WebSocket | null) => void;
  chatMessages: any[];
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>;
  customerMessageInput: string;
  setCustomerMessageInput: (msg: string) => void;
  
  adminTab: 'ai' | 'chat';
  setAdminTab: (tab: 'ai' | 'chat') => void;
  selectedAdminSessionId: string;
  setSelectedAdminSessionId: (id: string) => void;
  adminWs: WebSocket | null;
  setAdminWs: (ws: WebSocket | null) => void;
  adminChatInput: string;
  setAdminChatInput: (msg: string) => void;
  readMessageCounts: Record<string, number>;
  setReadMessageCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [customerMessageInput, setCustomerMessageInput] = useState('');
  
  const [adminTab, setAdminTab] = useState<'ai' | 'chat'>('chat');
  const [selectedAdminSessionId, setSelectedAdminSessionId] = useState<string>('');
  const [adminWs, setAdminWs] = useState<WebSocket | null>(null);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [readMessageCounts, setReadMessageCounts] = useState<Record<string, number>>({});

  return (
    <ChatContext.Provider value={{
      ws, setWs, chatMessages, setChatMessages, customerMessageInput, setCustomerMessageInput,
      adminTab, setAdminTab, selectedAdminSessionId, setSelectedAdminSessionId,
      adminWs, setAdminWs, adminChatInput, setAdminChatInput,
      readMessageCounts, setReadMessageCounts
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
