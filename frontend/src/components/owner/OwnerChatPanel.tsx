import { useState } from 'react';
import { Box, Typography, Button, TextField, IconButton, Divider } from '@mui/material';
import { Send, Mic, DeleteOutlined } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { useChatContext } from '../../contexts/ChatContext';
import { formatMsgTime, API_URL } from '../../utils/constants';

// Web Speech API 설정
const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
}

export default function OwnerChatPanel() {
  const { seats, setSeats } = useAppContext();
  const { 
    selectedAdminSessionId, 
    setSelectedAdminSessionId, 
    adminWs, 
    adminChatInput, 
    setAdminChatInput, 
    readMessageCounts,
    setReadMessageCounts
  } = useChatContext();

  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 등을 사용해 주세요.');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognition.start();
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAdminChatInput(adminChatInput + (adminChatInput ? ' ' : '') + transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  const sendAdminMessage = (text: string) => {
    if (!selectedAdminSessionId || !adminWs || adminWs.readyState !== WebSocket.OPEN) return;
    
    adminWs.send(JSON.stringify({
      session_id: selectedAdminSessionId,
      text: text
    }));
    
    const newMsg = {
      sender: 'admin',
      text: text,
      timestamp: new Date().toISOString()
    };
    
    setSeats(prevSeats => {
      return prevSeats.map(seat => {
        if (seat.session_id === selectedAdminSessionId) {
          const meta = seat.metadata || {};
          const currentMsgs = meta.messages || [];
          return {
            ...seat,
            metadata: {
              ...meta,
              messages: [...currentMsgs, newMsg]
            }
          };
        }
        return seat;
      });
    });

    setReadMessageCounts(prev => ({
      ...prev,
      [selectedAdminSessionId]: (prev[selectedAdminSessionId] || 0) + 1
    }));
  };

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;
    sendAdminMessage(adminChatInput);
    setAdminChatInput('');
  };

  const handleClearMessages = async () => {
    if (!selectedAdminSessionId) return;
    if (!window.confirm("정말 이 세션의 모든 채팅 기록을 삭제하시겠습니까?")) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/chat/${selectedAdminSessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSeats(prev => prev.map(s => {
          if (s.session_id === selectedAdminSessionId) {
            return {
              ...s,
              metadata: {
                ...(s.metadata || {}),
                messages: []
              }
            };
          }
          return s;
        }));
      } else {
        alert('채팅 초기화에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('채팅 초기화 중 오류가 발생했습니다.');
    }
  };

  const currentSeat = selectedAdminSessionId ? seats.find(s => s.session_id === selectedAdminSessionId) : null;

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
        {/* 좌/상단: 활성 세션 목록 */}
        <Box sx={{ 
          width: { xs: '100%', md: '250px' }, 
          borderRight: { xs: 'none', md: '1px solid #334155' }, 
          borderBottom: { xs: '1px solid #334155', md: 'none' },
          overflowY: { xs: 'hidden', md: 'auto' }, 
          overflowX: { xs: 'auto', md: 'hidden' },
          p: 1, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, gap: 1, flexShrink: 0 
        }}>
          <Typography variant="caption" color="gray" sx={{ fontWeight: 700, px: 0.5, py: 0.5, minWidth: { xs: '80px', md: 'auto' }, alignSelf: { xs: 'center', md: 'flex-start' } }}>이용 고객 목록</Typography>
          {seats.filter(s => s.is_occupied).length === 0 ? (
            <Typography variant="caption" color="gray" sx={{ p: 1, textAlign: 'center' }}>이용객 없음</Typography>
          ) : (
            seats.filter(s => s.is_occupied).map(seat => {
              const isSelected = selectedAdminSessionId === seat.session_id;
              const msgs = seat.metadata?.messages || [];
              const totalMsgs = msgs.length;
              const readMsgs = readMessageCounts[seat.session_id || ''] || 0;
              const isUnread = totalMsgs > readMsgs;
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].text : '대화 내역 없음';
              
              return (
                <Button
                  key={seat.id}
                  fullWidth
                  onClick={() => {
                    setSelectedAdminSessionId(seat.session_id);
                    setReadMessageCounts(prev => ({ ...prev, [seat.session_id]: totalMsgs }));
                  }}
                  sx={{
                    textTransform: 'none',
                    color: isSelected ? '#ffffff' : '#f8fafc',
                    bgcolor: isSelected ? '#10b981' : isUnread ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    fontWeight: 800,
                    borderRadius: 2.5,
                    p: 1.2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    gap: 0.5,
                    border: isUnread ? '1px solid #10b981' : '1px solid transparent',
                    minWidth: { xs: '180px', md: 'auto' },
                    flexShrink: 0,
                    '&:hover': {
                      bgcolor: isSelected ? '#059669' : 'rgba(255,255,255,0.08)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                      {seat.name.replace('번 좌석', '')}번 ({seat.metadata?.user_name || '이용객'})
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {msgs.length > 0 && (
                        <Typography variant="caption" sx={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : '#64748b', fontWeight: 700 }}>
                          {formatMsgTime(msgs[msgs.length - 1].timestamp)}
                        </Typography>
                      )}
                      {isUnread && (
                        <Box 
                          sx={{ width: 6, height: 6, bgcolor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 6px #ef4444' }} 
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: isSelected ? 'rgba(255,255,255,0.8)' : '#94a3b8', 
                      fontSize: 10,
                      width: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: isUnread ? 900 : 500
                    }}
                  >
                    {lastMsg}
                  </Typography>
                </Button>
              );
            })
          )}
        </Box>

        {/* 우측: 메시지 창 */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedAdminSessionId || !currentSeat ? (
            <Box sx={{ my: 'auto', mx: 'auto', textAlign: 'center', px: 2, color: 'gray' }}>
              <Typography variant="body2">좌석 현황판에서 좌석을 클릭하거나<br />좌측 목록에서 고객을 선택해 주세요.</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', px: 2, py: 1, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981' }}>
                  {currentSeat.name} ({currentSeat.metadata?.user_name}) 고객 상담 창
                </Typography>
                <IconButton size="small" color="error" onClick={handleClearMessages} title="채팅 내역 초기화">
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Box>
              
              {(() => {
                const msgs = currentSeat.metadata?.messages || [];
                return (
                  <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {msgs.length === 0 ? (
                      <Box sx={{ my: 'auto', mx: 'auto', color: 'gray', fontSize: 12 }}>메시지 내역이 없습니다.</Box>
                    ) : (
                      msgs.map((m: any, idx: number) => {
                        const isMe = m.sender === 'admin';
                        const timeStr = formatMsgTime(m.timestamp);
                        return (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              flexDirection: isMe ? 'row-reverse' : 'row',
                              alignItems: 'flex-end',
                              gap: 0.8,
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                              maxWidth: '85%'
                            }}
                          >
                            <Box
                              sx={{
                                p: 1.2,
                                borderRadius: 3,
                                bgcolor: isMe ? '#0284c7' : '#334155',
                                color: '#ffffff',
                                fontSize: 13,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5
                              }}
                            >
                              <Typography variant="body2" sx={{ fontSize: 13 }}>{m.text}</Typography>
                              {m.text.startsWith('[주차 등록 요청]') && !isMe && (
                                <Button
                                  variant="contained"
                                  color="secondary"
                                  size="small"
                                  onClick={() => {
                                    const carNumber = m.text.replace('[주차 등록 요청] 차량번호:', '').trim();
                                    sendAdminMessage(`주차 등록이 완료되었습니다. (차량번호: ${carNumber})`);
                                  }}
                                  sx={{ mt: 0.5, borderRadius: 2, fontSize: 11, alignSelf: 'flex-start', py: 0.3 }}
                                >
                                  주차등록완료
                                </Button>
                              )}
                            </Box>
                            {timeStr && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#64748b',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  mb: 0.3,
                                  userSelect: 'none'
                                }}
                              >
                                {timeStr}
                              </Typography>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                );
              })()}
            </>
          )}
        </Box>
      </Box>

      {/* 입력창: 세션이 선택되었을 때만 하단 전체 너비로 표시 (가로 2배 확대 효과) */}
      {selectedAdminSessionId && currentSeat && (
        <>
          <Divider sx={{ bgcolor: '#334155' }} />
          <Box 
            component="form" 
            onSubmit={handleSendAdminReply}
            sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'center' }}
          >
            <IconButton 
              type="button"
              onClick={handleVoiceInput}
              sx={{ 
                bgcolor: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: isListening ? '#ef4444' : '#94a3b8', 
                '&:hover': { bgcolor: isListening ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)' },
                animation: isListening ? 'pulse 1.2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)' }
                }
              }}
            >
              <Mic sx={{ fontSize: 20 }} />
            </IconButton>
            <TextField
              fullWidth
              size="small"
              placeholder={isListening ? "음성 인식 중... 말씀해 주세요" : "고객에게 답변을 입력하세요..."}
              value={adminChatInput}
              onChange={(e) => setAdminChatInput(e.target.value)}
              sx={{ input: { color: 'white', fontSize: 13 }, bgcolor: '#0f172a', borderRadius: 2 }}
            />
            <IconButton type="submit" color="success" sx={{ bgcolor: '#10b981', color: 'white', '&:hover': { bgcolor: '#059669' } }}>
              <Send sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
}
