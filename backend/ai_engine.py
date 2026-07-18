import os
import json
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from google import genai
from google.genai import types

load_dotenv(find_dotenv(), override=True)

# Gemini API 설정
gemini_key = os.getenv("GEMINI_API_KEY")
gemini_client: genai.Client | None = None

if gemini_key and not gemini_key.startswith("MY_"):
    try:
        gemini_client = genai.Client(api_key=gemini_key)
        print("[OK] Gemini AI Engine configured successfully for MQcafe.")
    except Exception as e:
        print(f"[WARN] Failed to configure Gemini: {e}")
else:
    print("[WARN] GEMINI_API_KEY is missing or placeholder. Running in Mock AI mode.")

def generate_monthly_report(sessions: list, year_month: str) -> list:
    """만료된 원본 세션 데이터를 기반으로 AI를 사용하여 매출 통계 및 분석 리포트(JSONB)를 자동 생성"""
    if not sessions:
        return [
            {"name": "총 매출", "value": "0원"},
            {"name": "분석 결과", "value": "만료된 세션이 없습니다."}
        ]

    # 세션 데이터를 프롬프트용 텍스트로 요약 정리
    raw_summary = []
    for s in sessions:
        meta = s.get('metadata') or {}
        raw_summary.append({
            "session_id": s.get('session_id'),
            "table_id": s.get('table_id'),
            "checkin": s.get('checkin_time'),
            "checkout": s.get('checkout_time'),
            "user": meta.get('user_name'),
            "ticket": meta.get('ticket_type'),
            "amount": meta.get('amount', 0),
            "seat_type": meta.get('seat_type'),
            "total_outing": meta.get('total_outing_minutes', 0)
        })

    prompt = f"""
당신은 스터디 카페 전문 '운영 분석 AI 엔진'입니다. 제공된 한 달간의 스터디 카페 원본 이용 세션 목록을 심도 깊게 분석하여 사장님이 매장 운영 상황을 한눈에 볼 수 있도록 통계 및 비즈니스 리포트를 작성해 주세요.
대상 월: {year_month}

[이용 세션 원본 데이터]
{json.dumps(raw_summary, ensure_ascii=False, indent=2)}

[요구사항]
결과는 반드시 JSON 배열 형식이어야 하며, 각 항목은 '{{"name": "항목명", "value": "내용 또는 통계값"}}' 형태의 객체이어야 합니다.
다음 핵심 분석 결과를 꼭 포함하세요:
1. '총 매출' (숫자 금액과 함께 예: "1,250,000원")
2. '총 세션수' 및 '이용 고객수'
3. '인기 이용권 비율' (시간권/당일권/기간권 각각의 수량 및 매출 분석)
4. '좌석 유형 선호도 및 이용 효율성 분석' (open, focus, study_room 비교)
5. '외출 패턴 분석' (평균 외출 시간 및 외출 시간 초과 자동 퇴실 사례 등 특이점 기술)
6. '사장님을 위한 이번 달 운영 팁' (이용권 가격 조정, 특정 시간대 마케팅, 좌석 배치 변경 등의 구체적인 비즈니스 제안)

출력은 백틱(```json) 없이 원시 JSON 문자열로 반환하십시오.
"""
    
    if gemini_client:
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            resp_text = response.text
            if not resp_text:
                raise ValueError("Empty response text from Gemini API")
            result = json.loads(resp_text)
            # 리스트 형태가 아닐 경우 대비 포맷팅 보장
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and "items" in result:
                return result["items"]
            else:
                # 딕셔너리 리스트로 변환 시도
                return [{"name": k, "value": str(v)} for k, v in result.items()]
        except Exception as e:
            print(f"[AI ERROR] Failed to generate report with Gemini: {e}")
            # 폴백 처리 (기본 파이썬 집계로 요약)
            return _mock_aggregate_report(raw_summary)
    else:
        return _mock_aggregate_report(raw_summary)

def _mock_aggregate_report(raw_summary: list) -> list:
    """Gemini API 호출 실패 또는 API 키 누락 시 백업용 기본 수학적 집계 리포트 생성"""
    total_sales = sum(s['amount'] for s in raw_summary)
    total_sessions = len(raw_summary)
    tickets = {}
    for s in raw_summary:
        tickets[s['ticket']] = tickets.get(s['ticket'], 0) + 1
    
    ticket_summary = ", ".join([f"{k}: {v}건" for k, v in tickets.items()])
    
    return [
        {"name": "총 매출", "value": f"{total_sales:,}원"},
        {"name": "총 이용 건수", "value": f"{total_sessions}건"},
        {"name": "이용권별 현황", "value": ticket_summary},
        {"name": "안내", "value": "Gemini API 키가 설정되지 않아 로컬 기본 통계로 대체되었습니다. .env를 확인해 주세요."}
    ]

def chat_with_admin(query: str, history: list, store_id: str) -> str:
    """사장님의 매장 분석 질문에 대해 knowledge_bundles 데이터를 기반으로 Gemini RAG 답변 생성"""
    
    # 지식 창고의 데이터 요약
    context = ""
    for bundle in history[:12]: # 최근 1년치 요약
        items_str = ", ".join([f"{item['name']}: {item['value']}" for item in bundle.get('items', [])])
        context += f"[{bundle.get('title')}] ({bundle.get('timestamp')} 생성)\n데이터: {items_str}\n\n"

    prompt = f"""
당신은 스터디 카페 사장님을 위한 든든한 '경영 컨설턴트 AI'입니다.
저장된 과거 월간 매장 매출/이용 요약 데이터(지식 창고)를 참고하여, 사장님의 질문에 명확하고 비즈니스 관점에서 유용한 답변을 해주세요.

[매장 월간 요약 데이터 목록]
{context if context else "아직 월간 매출 통계 데이터가 지식 창고에 누적되지 않았습니다."}

[사장님 질문]
"{query}"

[답변 가이드라인]
1. 매출이나 이용률 트렌드 분석을 요청할 경우, 가능한 과거 데이터의 변화를 정량적으로 비교해 주세요.
2. 해결책을 제시할 때는 단순히 이론적인 얘기가 아니라, '시간권 금액 할인', 'focus 좌석 증설', '외출 시간 단축' 등 스터디 카페 운영에 즉각 적용 가능한 대안을 구체적으로 제시하세요.
3. 친절하고 신뢰감 있는 사장님 전용 비서의 톤앤매너(한국어, 경어체)를 유지해 주세요.
4. 마크다운 스타일(글머리 기호, 굵은 글씨 등)을 적절히 사용하여 가독성을 높이세요.
"""

    if gemini_client:
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            resp_text = response.text
            return resp_text if resp_text is not None else "⚠️ Gemini AI가 빈 답변을 반환했습니다."
        except Exception as e:
            return f"❌ Gemini AI 답변 생성 중 오류가 발생했습니다: {str(e)}"
    else:
        return "⚠️ Gemini API 키가 올바르게 설정되지 않아 실시간 AI 답변을 드릴 수 없습니다. .env의 `GEMINI_API_KEY`를 확인해 주세요."
