import sys
import os
from datetime import datetime
from collections import defaultdict

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

from db.study_cafe_db import get_expired_sessions, delete_sessions, save_knowledge_bundle
from ai_engine import generate_monthly_report

def run_archiving_job(store_id: str = "ST001") -> dict:
    """만료된 개별 세션 데이터를 정리하여 통계 데이터로 압축 저장하고 원본 데이터를 물리적으로 삭제"""
    print(f"[{datetime.now().isoformat()}] Starting Study Cafe Archiving Job for store: {store_id}...")
    
    # 1. 만료되거나 퇴실 완료된 모든 세션 가져오기
    expired_sessions = get_expired_sessions(store_id)
    if not expired_sessions:
        print("No expired or closed sessions to archive.")
        return {"status": "success", "archived_count": 0, "bundles_created": []}
        
    print(f"Found {len(expired_sessions)} expired/closed sessions. Grouping by month...")
    
    # 2. 월별로 그룹화 (체크인 시각 기준 혹은 종료 시각 기준, 여기서는 checkin_time의 YYYY-MM 추출)
    monthly_groups = defaultdict(list)
    for s in expired_sessions:
        # checkin_time 형식: '2026-07-01T20:00:00.000Z' 또는 '2026-07-01T20:00:00'
        checkin_str = s.get('checkin_time', '')
        if len(checkin_str) >= 7:
            year_month = checkin_str[:7] # YYYY-MM 추출
        else:
            year_month = datetime.now().strftime("%Y-%m")
        monthly_groups[year_month].append(s)
        
    bundles_created = []
    all_processed_ids = []
    
    # 3. 각 월별 데이터에 대해 AI 매출 통계 보고서 생성 및 DB 적재
    for ym, sessions in monthly_groups.items():
        print(f"Processing month: {ym} ({len(sessions)} sessions)...")
        
        # AI 보고서 생성
        year_str, month_str = ym.split('-')
        title = f"{year_str}년 {month_str}월 스터디 카페 매출 및 운영 리포트"
        
        # Gemini API 호출하여 요약 생성
        ai_summary_items = generate_monthly_report(sessions, f"{year_str}년 {month_str}월")
        
        bundle_id = f"SC-MONTHLY-STATS-{store_id}-{ym}"
        
        # 지식 창고(knowledge_bundles)에 저장
        success = save_knowledge_bundle(
            bundle_id=bundle_id,
            type="StudyCafeStats",
            store_id=store_id,
            title=title,
            items=ai_summary_items
        )
        
        if success:
            print(f"Successfully archived stats to bundle: {bundle_id}")
            bundles_created.append(bundle_id)
            all_processed_ids.extend([s['session_id'] for s in sessions])
        else:
            print(f"❌ Failed to save knowledge bundle for {ym}")
            
    # 4. 아카이빙 성공한 원본 세션 데이터 삭제
    deleted_count = 0
    if all_processed_ids:
        print(f"Deleting {len(all_processed_ids)} raw archived sessions...")
        delete_success = delete_sessions(all_processed_ids)
        if delete_success:
            deleted_count = len(all_processed_ids)
            print(f"Successfully deleted {deleted_count} raw sessions.")
        else:
            print("❌ Failed to delete raw sessions from table_sessions.")
            
    print(f"[{datetime.now().isoformat()}] Archiving Job Completed. Archived: {deleted_count} sessions.")
    return {
        "status": "success",
        "archived_count": deleted_count,
        "bundles_created": bundles_created
    }

if __name__ == "__main__":
    run_archiving_job()

