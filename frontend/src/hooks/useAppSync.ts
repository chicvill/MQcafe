import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';
import { WS_URL, MQTT_BROKER, MQTT_OPTIONS, playNotificationSound } from '../utils/constants';
import { useAppContext } from '../contexts/AppContext';
import { useUserContext } from '../contexts/UserContext';
import { useChatContext } from '../contexts/ChatContext';

export const useAppSync = (
  fetchSeats: () => void,
  pendingPayRef: React.MutableRefObject<{ requestId: string; onApprove: () => void } | null>
) => {
  const { storeId, mode, setTerminalConnected, setPayAppLoading, setPayStep, setSeats } = useAppContext();
  const { activeSession, setActiveSession } = useUserContext();
  const { setChatMessages, setAdminWs, selectedAdminSessionId, setReadMessageCounts } = useChatContext();
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const mqttClientRef = useRef<any>(null);
  const terminalHeartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSessionRef = useRef(activeSession);
  const selectedAdminSessionIdRef = useRef(selectedAdminSessionId);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    selectedAdminSessionIdRef.current = selectedAdminSessionId;
  }, [selectedAdminSessionId]);

  // MQTT 연결
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS);
    mqttClientRef.current = client;

    client.on('connect', () => {
      client.subscribe(`stcafe/${storeId}/update`);
      client.subscribe(`terminal/${storeId}/heartbeat`);
      client.subscribe(`terminal/${storeId}/pay/result`);
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic === `stcafe/${storeId}/update`) {
          if (payload.type === 'CHECKIN' || payload.type === 'CHECKOUT' || payload.type === 'UPDATE' || payload.action === 'seat_updated' || payload.action === 'init') {
            fetchSeats();
          }
          if (payload.type === 'nfc_scan_result' && payload.session_id === activeSessionRef.current?.session_id) {
            window.dispatchEvent(new CustomEvent('nfc_scan_event', { detail: payload.data }));
          }
          if ((payload.type === 'OUTING_TOGGLE' || payload.type === 'CHECKIN' || payload.type === 'CHECKOUT') && payload.session_id === activeSessionRef.current?.session_id) {
            setActiveSession((prev: any) => prev ? { ...prev, status: payload.status } : prev);
          }
        }

        if (topic === `terminal/${storeId}/heartbeat`) {
          setTerminalConnected(true);
          if (terminalHeartbeatRef.current) clearTimeout(terminalHeartbeatRef.current);
          terminalHeartbeatRef.current = setTimeout(() => setTerminalConnected(false), 60000);
        }

        if (topic === `terminal/${storeId}/pay/result`) {
          if (
            payload.action === 'pay_result' &&
            payload.status === 'approved' &&
            pendingPayRef.current &&
            pendingPayRef.current.requestId === payload.requestId
          ) {
            pendingPayRef.current.onApprove();
            pendingPayRef.current = null;
          } else if (payload.action === 'pay_result' && payload.status !== 'approved') {
            alert(`결제 거절: ${payload.reason || '단말기 결제가 거절되었습니다.'}`);
            setPayAppLoading(false);
            setPayStep('select');
          }
        }
      } catch (e) {
        console.error('MQTT message parse error:', e);
      }
    });

    return () => {
      client.end();
      if (terminalHeartbeatRef.current) clearTimeout(terminalHeartbeatRef.current);
    };
  }, [storeId, fetchSeats, pendingPayRef, setTerminalConnected, setPayAppLoading, setPayStep, setActiveSession]);

  // WebSocket 통신 (고객용)
  useEffect(() => {
    if (!activeSession?.session_id) return;
    const socket = new WebSocket(`${WS_URL}/ws/customer/${activeSession.session_id}`);
    socket.onopen = () => {
      setWs(socket);
      setChatMessages(activeSession.metadata?.messages || []);
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'admin_message') {
          setChatMessages((prev: any[]) => [...prev, data.message]);
          playNotificationSound();
        } else if (data.type === 'nfc_scan_result') {
          window.dispatchEvent(new CustomEvent('nfc_scan_event', { detail: data.data }));
        }
      } catch (err) { console.error(err); }
    };
    socket.onclose = () => setWs(null);
    return () => { socket.close(); };
  }, [activeSession?.session_id, setChatMessages]);

  // WebSocket 통신 (관리자/점주용)
  useEffect(() => {
    if (mode !== 'owner') return;
    const socket = new WebSocket(`${WS_URL}/ws/admin`);
    socket.onopen = () => {
      setAdminWs(socket);
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'customer_message') {
          const { session_id, message } = data;
          setSeats((prevSeats: any[]) => {
            return prevSeats.map(seat => {
              if (seat.session_id === session_id) {
                const meta = seat.metadata || {};
                const currentMsgs = meta.messages || [];
                const exists = currentMsgs.some((m: any) => m.timestamp === message.timestamp && m.text === message.text);
                if (exists) return seat;
                return { ...seat, metadata: { ...meta, messages: [...currentMsgs, message] } };
              }
              return seat;
            });
          });
          playNotificationSound();

          const activeAdminSessId = selectedAdminSessionIdRef.current;
          if (session_id === activeAdminSessId) {
            setReadMessageCounts((prev: any) => ({ ...prev, [session_id]: (prev[session_id] || 0) + 1 }));
          }
        } else if (data.type === 'admin_reply') {
          const { session_id, message } = data;
          setSeats((prevSeats: any[]) => {
            return prevSeats.map(seat => {
              if (seat.session_id === session_id) {
                const meta = seat.metadata || {};
                const currentMsgs = meta.messages || [];
                const exists = currentMsgs.some((m: any) => m.timestamp === message.timestamp && m.text === message.text);
                if (exists) return seat;
                return { ...seat, metadata: { ...meta, messages: [...currentMsgs, message] } };
              }
              return seat;
            });
          });
        } else if (data.type === 'system_message') {
          const { session_id, message } = data;
          setSeats((prevSeats: any[]) => {
            return prevSeats.map(seat => {
              if (seat.session_id === session_id) {
                const meta = seat.metadata || {};
                const currentMsgs = meta.messages || [];
                const exists = currentMsgs.some((m: any) => m.timestamp === message.timestamp && m.text === message.text);
                if (exists) return seat;
                return { ...seat, metadata: { ...meta, messages: [...currentMsgs, message] } };
              }
              return seat;
            });
          });
          playNotificationSound();
        }
      } catch (err) { console.error(err); }
    };
    return () => { socket.close(); };
  }, [mode, setAdminWs, setSeats, setReadMessageCounts]);

  return { ws, mqttClientRef };
};
