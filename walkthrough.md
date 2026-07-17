# 스터디 카페 SaaS 시스템 신규 개발 완료 보고서 (Walkthrough)

고객 모바일 접속 화면의 간결함과 개인정보 보호를 위해 복잡한 입력 및 설정 항목들을 좌측 슬라이드 메뉴(Drawer)로 개편하는 작업, 그리고 재접속 시 자동 세션 복구 및 PayApp 결제 대행 시뮬레이터 탑재, 어드민 대시보드 내 실시간 1:1 고객 채팅 데스크 편의성 대폭 개선(마지막 대화 고객 자동 선택, 메시지 전송 시각 노출, 알림음 기능 포함) 작업을 완수하였습니다.

---

## 📁 추가/수정된 핵심 파일 내역

1.  **백엔드**:
    *   [connection.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/db/connection.py): 데이터베이스 초기화 시 2개의 매장 정보 적재.
    *   [study_cafe_db.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/db/study_cafe_db.py): 활성 세션 이름/전화번호 조회 지원.
    *   [study_cafe.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/routers/study_cafe.py):
        *   출입문 제어 엔드포인트 `/entry`, 복구 엔드포인트 `/session/restore` 구현.
        *   실시간 고객/어드민 채팅 WebSocket 구현 및 `timestamp` 필드 자동 주입.
2.  **프론트엔드**:
    *   [App.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/App.tsx):
        *   **실시간 메시지 도착 알림음 지원**:
            *   브라우저 자체 **Web Audio API** 기반의 톤 오실레이터 합성 기능을 내장하였습니다. 다운로드형 외부 `.mp3` 에셋 의존성 없이, 기기 자체적으로 맑고 고운 알림 이중음(D5 톤과 A5 톤이 0.08초 간격으로 연속 재생 후 지수 감쇄)을 생성해 들려줍니다.
            *   고객 모바일에서 관리자 답변을 수신했을 때와, 관리자 어드민에서 고객의 새 문의를 수신했을 때 각각 부드러운 차임벨 알림음이 재생됩니다.
        *   **메시지 전송/도착 시간 추가**: 채팅 말풍선 옆 및 어드민 고객 리스트에 실시간 전송 시각(`HH:MM`)을 표기합니다.
        *   **마지막 대화 고객 자동 선택 & 대화 노출**: 관리자 대시보드 진입 시 혹은 새로운 메시지가 도착했을 때, 최근 대화가 활발했던 고객을 자동 바인딩합니다.
        *   **어드민 1:1 고객 채팅 디폴트 활성화**: 어드민 화면 우측 패널의 탭 디폴트 상태를 `chat`으로 설정했습니다.
        *   **읽음/안읽음 메시지 구분 기능**: 신규 미확인 메시지가 있는 경우 빨간색 알림 점과 녹색 배경색으로 강조합니다.
        *   **최종 전달 메시지 미리보기**: 고객 목록의 세션 버튼 내에 최종 수신된 메시지를 최대 1줄로 노출합니다.
        *   **좌측 이용 고객 목록 가로폭 확장**: 너비를 기존 `130px`에서 `180px`로 여유롭게 조정하였습니다.
        *   **다양한 결제 수단 추가 지원 (앱카드 & Pay 간편결제)**: PayApp 결제 대행 시뮬레이터 내에서 신용카드, 앱카드, 모바일 페이(네이버/카카오/삼성/토스페이) 선택 결제를 완벽 지원합니다.
3.  **인쇄용 안내 포스터**:
    *   [print_poster.html](file:///c:/Users/USER/Desktop/Workstation/STcafe/print_poster.html):
        *   **무선 카드 단말기 안내 영역 추가**: QR코드 이미지 출력 프레임 바로 아래에 실물 카드 결제용 무선 카드 단말기 안내 박스를 미려하게 삽입하였습니다.

---

## ⚙️ 상세 설계 및 변경 요소 설명

### 1. Web Audio API 알림 차임벨
*   별도의 미디어 오디오 리소스를 요청하여 발생할 수 있는 네트워크 랙이나 에러 요소를 배제하고자, 브라우저 스레드에서 직접 `AudioContext` 및 `OscillatorNode`를 인스턴스화하여 실시간 오디오 신호를 빚어냅니다.
*   `sine` 파형을 사용하여 귓가에 자극적이지 않고 영롱한 효과음을 구현했으며, `exponentialRampToValueAtTime`을 주어 음이 자연스럽게 여운을 남기며 사라집니다.

---

## 🛠️ Pyrefly 정적 타입 분석 진단 해결 내역

Pyrefly 정적 분석 도구에서 감지된 5개의 타입 불일치 경고를 완벽히 해결하였습니다:

1. **`study_cafe_db.py` 타입 경고 해결 (`bad-return`)**:
   - **원인**: `get_all_stores`, `get_stores_by_owner`, `get_all_active_sessions`, `get_expired_sessions` 함수들은 `List[dict]` 타입을 반환하도록 선언되어 있었으나, 내부 리스트 컴프리헨션에서 호출하는 `_row_to_dict` 함수가 `Optional[dict]` (`dict | None`) 타입을 반환하여 타입 검사기가 `list[dict | None]`으로 추론했습니다.
   - **해결**: row가 절대 `None`일 수 없는 list fetch 상황 전용 헬퍼인 `_convert_row(row) -> dict`를 새로 분리하여 컴프리헨션에 사용함으로써, 타입 검사기가 반환형을 정확히 `List[dict]`로 인식하게 했습니다.

2. **`study_cafe.py` 타입 경고 해결 (`bad-assignment`)**:
   - **원인**: 좌석 정보 갱신 중에 `status_info` 딕셔너리의 타입이 초기 선언값들의 유니온 타입(`bool | int | str | None`)으로 좁게 추론되어, 이후 `status_info["metadata"] = meta`와 같이 nested dictionary(타입: `dict[Unknown, Unknown] | Unknown`)를 할당하려 할 때 타입 불일치 에러가 발생했습니다.
   - **해결**: `status_info` 딕셔너리에 명시적 타입 주석 `status_info: Dict[str, Any]`를 선언하여 어떤 타입의 값(특히 딕셔너리 객체)이든 안전하게 할당할 수 있도록 교정했습니다.

---

## 💳 NicePay `clientId가 유효하지 않습니다 (P006)` 오류 해결 내역

### 원인 분석 (Vite 빌드타임 스코핑 문제)
* **상황**: Render 등의 플랫폼에서 Docker 빌드 시 `npm run build`가 수행되어 프론트엔드가 컴파일됩니다.
* **원인**: Vite 환경변수(`VITE_NICEPAY_CLIENT_ID`)는 **빌드 타임(Build-time)**에 정적 파일로 삽입되는데, Docker 이미지 빌드 당시에는 Render 대시보드에 지정된 런타임 환경변수에 접근할 수 없습니다. 따라서 클라이언트 키가 `undefined`로 고정된 상태로 빌드되었고, 브라우저가 기본값인 `'R2_TEST_CLIENT_ID'`를 NicePay SDK로 전송하여 `[P006]clientId가 유효하지 않습니다.(GID 획득 실패)` 에러가 발생했습니다.

### 해결 방안 (백엔드 런타임 조회 방식 도입)
빌드 타임 환경변수 주입의 한계를 근본적으로 해결하기 위해, **런타임 시점에 백엔드 API로부터 안전하게 Client ID를 가져오는 방식**으로 개선하였습니다.

1. **백엔드 설정 추가**: 
   - [study_cafe.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/routers/study_cafe.py)에 `/api/study-cafe/config` GET 엔드포인트를 추가하여 백엔드의 런타임 환경변수(즉, `.env`나 Render 대시보드 설정값)에서 안전하게 `NICEPAY_CLIENT_ID`를 전달하도록 구현했습니다.
2. **프론트엔드 비동기 조회 및 적용**:
   - [PaymentModal.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/components/customer/PaymentModal.tsx)의 마운트 시점에 해당 `/config` API를 비동기 호출하여 `nicepayClientId` 상태값에 바인딩했습니다.
   - 결제 요청(`AUTHNICE.requestPay`) 시, 해당 상태값을 사용하도록 코드를 변경해 런타임 환경변수가 완벽히 연동되도록 하였습니다.

---

## 🔐 점주 모드 회원가입/로그인 404 (Not Found) 오류 해결 내역

### 원인 분석 (API 경로 중복 바인딩)
* **상황**: 점주 모드에서 회원가입 및 로그인 요청을 넣었을 때 알림창에 `Not Found` 오류가 발생했습니다.
* **원인**: `constants.ts`에 정의된 `API_URL`은 이미 백엔드 공통 API 프리픽스인 `/api/study-cafe`를 포함하고 있습니다 (`http://localhost:8080/api/study-cafe` 혹은 `https://stcafe.chicvill.store/api/study-cafe`).
* 하지만 [OwnerMain.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/components/owner/OwnerMain.tsx)에서 회원가입/로그인 엔드포인트 문자열을 정의할 때 `/api/study-cafe/owner/signup` 및 `/api/study-cafe/owner/login`으로 적어놓아, 최종 요청 경로가 `.../api/study-cafe/api/study-cafe/owner/signup` 형태로 경로가 중복되는 현상이 발생하여 서버로부터 404 에러를 반환받았습니다.

### 해결 방안
* [OwnerMain.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/components/owner/OwnerMain.tsx#L36)에서 엔드포인트 문자열의 중복된 공통 접두사(`/api/study-cafe`)를 제거하여, 정상적인 백엔드 라우터 경로인 `${API_URL}/owner/signup` 및 `${API_URL}/owner/login`으로 올바르게 전송되도록 코드를 교정했습니다.

---

## ⏳ 고객 화면 잔여 시간 표기 개선 (`xx시간 xx분`)

* **요청 사항**: 기존 `10080분`과 같이 단순히 분(minute) 단위로만 출력되던 잔여 시간을 직관적인 `xx시간 xx분` 형태로 변경하고자 했습니다.
* **해결 방안**: 
  - [ActiveSession.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/components/customer/ActiveSession.tsx)에 시간 변환 유틸 함수 `formatRemaining(minutes)`을 추가했습니다.
  - 이 함수는 잔여 분을 받아 `60`분 이상일 경우 시간(`Math.floor(minutes / 60)`)과 분(`minutes % 60`)을 분리하여 `168시간 0분`과 같이 포맷팅해 줍니다. 만약 60분 미만인 경우 기존처럼 분 단위(`45분`)로 부드럽게 노출되도록 사용자 경험을 다듬었습니다.

---

## 🔒 일반 고객 이용권 예약 등록/복구 시 비밀번호 보안 기능 도입

일반 이용 고객이 사칭이나 정보 노출 위험 없이 안전하게 이용 정보를 복구하고 출입할 수 있도록 비밀번호 보안 절차를 새롭게 추가하였습니다.

### 1. 백엔드 보안 연동
* **API 스키마 개편**: 
  - [schemas.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/schemas.py) 내 `CheckInRequest` 및 `RestoreRequest` 스키마에 `password` 필드를 필수 값으로 추가했습니다.
* **비밀번호 단방향 암호화(해싱)**:
  - [study_cafe.py](file:///c:/Users/USER/Desktop/Workstation/STcafe/backend/routers/study_cafe.py)의 `/checkin` 엔드포인트에서 비밀번호를 평문으로 노출하지 않고 `hashlib.sha256` 해시 값으로 즉시 변환하여 세션 메타데이터의 `password_hash` 필드에 보관하도록 하였습니다.
* **복구 시 암호 검증**:
  - `/session/restore`에서 유저 정보를 조회한 뒤, 전달된 비밀번호 해시와 저장된 비밀번호 해시를 비교 분석합니다. 비밀번호 불일치 시 `401 Unauthorized` 예외와 함께 `"비밀번호가 일치하지 않습니다."` 디테일 메시지를 리턴합니다. (하위 호환성을 적용하여 기존 비밀번호가 없이 저장되어 있는 테스트 레코드들은 무사 통과합니다.)

### 2. 프론트엔드 UI/UX 개편
* **비밀번호 입력 추가**:
  - [CustomerMain.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/components/customer/CustomerMain.tsx)의 좌측 Drawer '1. 개인정보 입력' 영역 하단에 비밀번호(`type="password"`) 입력란을 신설하였습니다.
* **Context 상태 전파**:
  - [UserContext.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/contexts/UserContext.tsx)에서 `password` 및 `setPassword` 전역 상태를 선언하여 화면 전환 시에도 세션 복구에 입력란 데이터를 공유할 수 있게 했습니다.
* **유효성 검사 및 페이로드 바인딩**:
  - [App.tsx](file:///c:/Users/USER/Desktop/Workstation/STcafe/frontend/src/App.tsx)의 `handleCheckIn` 및 `handleRestoreSession` 로직에 이름, 전화번호 외에 비밀번호 미입력 시 검증(Alert 경고) 단계를 추가하였고, 요청 본문에 비밀번호를 실어 보내도록 바인딩 완료했습니다.





