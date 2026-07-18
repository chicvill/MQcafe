"""
utils.py
========
MQcafe 백엔드 공통 유틸리티 함수 모음.
라우터, 스케줄러 등 여러 곳에서 재사용합니다.
"""
from datetime import datetime
from typing import Optional


def mask_name(name: Optional[str]) -> str:
    """개인정보 보호를 위해 이름 중간 글자를 '*'로 마스킹.

    Examples:
        "홍길동" → "홍*동"
        "김철수" → "김*수"
        "이영"   → "이*"
        "박"     → "박"
    """
    if not name:
        return ""
    if len(name) <= 1:
        return name
    if len(name) == 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 2) + name[-1]


def is_within_valid_period(
    entry_str: Optional[str],
    exit_str: Optional[str],
) -> bool:
    """이용권 유효 시간 범위 검증.

    - 시작 시각 5분 전부터 종료 시각 5분 후까지를 유효 범위로 판단합니다.
    - entry_str / exit_str 모두 None이면 무조건 True(제한 없음)를 반환합니다.

    Args:
        entry_str: ISO 8601 형식의 입장 예약 시각 문자열 (nullable).
        exit_str:  ISO 8601 형식의 퇴실 예약 시각 문자열 (nullable).

    Returns:
        현재 시각이 유효 범위 안에 있으면 True, 아니면 False.
    """
    valid_start: Optional[datetime] = None
    valid_end: Optional[datetime] = None

    if entry_str:
        try:
            valid_start = datetime.fromisoformat(entry_str)
        except Exception:
            pass

    if exit_str:
        try:
            valid_end = datetime.fromisoformat(exit_str)
        except Exception:
            pass

    now = datetime.now()
    if valid_start and valid_start.tzinfo is not None:
        now = now.astimezone(valid_start.tzinfo)
    elif valid_end and valid_end.tzinfo is not None:
        now = now.astimezone(valid_end.tzinfo)

    # 둘 다 없으면 시간 제한 없음
    if not valid_start and not valid_end:
        return True

    # 양쪽 모두 있을 때: 시작 5분 전 ~ 종료 5분 후
    if valid_start and valid_end:
        diff_start = (now - valid_start).total_seconds() / 60.0
        diff_end = (now - valid_end).total_seconds() / 60.0
        return diff_start >= -5.0 and diff_end <= 5.0

    # 시작 시각만 있을 때: 시작 5분 전 이후
    if valid_start:
        diff_start = (now - valid_start).total_seconds() / 60.0
        return diff_start >= -5.0

    # 종료 시각만 있을 때: 종료 5분 후 이내
    if valid_end:
        diff_end = (now - valid_end).total_seconds() / 60.0
        return diff_end <= 5.0

    return True
