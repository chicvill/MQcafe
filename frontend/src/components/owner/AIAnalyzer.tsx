import { useState } from 'react';
import { Box, Typography, Button, TextField, IconButton, Divider, Card, CardContent, Paper } from '@mui/material';
import { Send, ReceiptLong } from '@mui/icons-material';
import { useAppContext } from '../../contexts/AppContext';
import { API_URL } from '../../utils/constants';

export default function AIAnalyzer() {
  const { storeId } = useAppContext();
  
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string>('');

  const handleSendQuery = async (query: string) => {
    if (!query.trim()) return;

    setChatHistory(prev => [...prev, { role: 'user', text: query }]);
    setChatQuery('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, query: query })
      });
      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', text: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', text: `오류가 발생했습니다: ${data.detail || '알 수 없음'}` }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: `네트워크 오류가 발생했습니다: ${err}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSendQuery(chatQuery);
  };

  const handleTriggerArchive = async () => {
    if (!window.confirm('만료된 세션을 정리하고 AI 분석 아카이브를 생성하시겠습니까?\n이 작업은 시간이 다소 소요될 수 있습니다.')) return;
    
    setArchiveResult('아카이빙 작업이 시작되었습니다. 잠시만 기다려 주세요...');
    try {
      const res = await fetch(`${API_URL}/admin/trigger-archive?store_id=${storeId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setArchiveResult(`아카이빙 완료:
- 정리된 세션 수: ${data.archived_count}개
- 생성된 아카이브 번들: ${data.bundles_created?.join(', ') || '없음'}`);
      } else {
        setArchiveResult(`아카이빙 실패: ${data.detail}`);
      }
    } catch (e) {
      setArchiveResult(`오류 발생: ${e}`);
    }
  };

  return (
    <>
      <Card sx={{ bgcolor: '#1e293b', color: '#f8fafc', borderRadius: 4, border: '1px solid #334155', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong color="secondary" /> 만료 세션 정리 및 AI 아카이빙
          </Typography>
          <Typography variant="body2" color="gray" sx={{ mb: 2 }}>
            만료되거나 퇴실이 완료된 개별 세션 데이터를 정리하여 요약한 뒤, AI 통계 분석서로 변환하여 지식 창고에 저장하고 원본 상세 데이터는 완전히 파기합니다.
          </Typography>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleTriggerArchive}
            sx={{ borderRadius: 3, fontWeight: 750 }}
          >
            아카이빙 수동 실행 (데이터 정리)
          </Button>
          
          {archiveResult && (
            <Paper sx={{ p: 2, bgcolor: '#0f172a', border: '1px dashed #475569', mt: 2 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {archiveResult}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            AI 경영 컨설턴트 챗봇
          </Typography>
          <Typography variant="caption" color="gray">지식 창고(아카이빙 리포트) 데이터를 기반으로 대화합니다.</Typography>
        </CardContent>
        
        <Divider sx={{ bgcolor: '#334155' }} />
        
        {/* 대화 히스토리 */}
        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, height: '300px' }}>
          {chatHistory.length === 0 ? (
            <Box sx={{ textAlignment: 'center', my: 'auto', color: 'gray', textAlign: 'center', px: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>안녕하세요! 스터디 카페 AI 경영 컨설턴트입니다.</Typography>
              <Typography variant="caption">"이번 달 총 매출은 얼마야?", "가장 인기 있는 이용권은 뭐야?" 등 누적 아카이브 리포트 기반의 궁금증을 질문해 보세요.</Typography>
            </Box>
          ) : (
            chatHistory.map((chat, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: chat.role === 'user' ? '#10b981' : '#0f172a',
                  border: chat.role === 'ai' ? '1px solid #334155' : 'none'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {chat.text}
                </Typography>
              </Box>
            ))
          )}
          {aiLoading && (
            <Box sx={{ alignSelf: 'flex-start', bgcolor: '#0f172a', p: 1.5, borderRadius: 3, border: '1px solid #334155' }}>
              <Typography variant="body2">AI 컨설턴트가 생각 중입니다...</Typography>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ bgcolor: '#334155' }} />

        {/* 입력창 */}
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Suggested Questions */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {["이번 달 총 매출은 얼마야?", "가장 인기 있는 이용권은 뭐야?", "스터디룸 이용률은 어때?", "최근 불만사항이나 컴플레인 요약해줘"].map((q, idx) => (
              <Button 
                key={idx} 
                variant="outlined" 
                size="small" 
                onClick={() => handleSendQuery(q)}
                sx={{ 
                  borderRadius: 4, 
                  color: '#94a3b8', 
                  borderColor: '#334155', 
                  textTransform: 'none', 
                  '&:hover': { color: '#10b981', borderColor: '#10b981', bgcolor: 'rgba(16, 185, 129, 0.05)' } 
                }}
              >
                {q}
              </Button>
            ))}
          </Box>
          <Box component="form" onSubmit={handleSendChat} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="AI에게 질문할 내용을 직접 입력하시거나 위의 예시를 클릭하세요..."
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              sx={{ input: { color: 'white' }, bgcolor: '#0f172a', borderRadius: 2 }}
            />
            <IconButton type="submit" color="success" sx={{ bgcolor: '#10b981', color: 'white', '&:hover': { bgcolor: '#059669' } }}>
              <Send />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </>
  );
}
