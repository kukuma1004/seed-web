# 웹 이용 집계

웹 집계 코드는 2026-09-24에 배포했다. 실제 집계는 Firebase 규칙을 게시한 시점부터 시작한다. Android Play Console 수치와 섞지 않는다.

- `방문 브라우저`: 서울 날짜별로 브라우저의 별도 익명 Firebase UID를 한 번만 기록한다. 사람 수나 계정 수의 정확한 대체값은 아니다. 브라우저 데이터를 지우거나 다른 기기를 쓰면 새 방문자로 잡힌다.
- `전투 진입`: 새 판 시작과 체크포인트 이어하기 횟수를 기록한다. 개발자 실험과 로컬 서버는 제외한다.
- `로그인 실패`: Google·Apple·게스트 로그인 실패를 네 종류(network/config/popup/other)로만 센다. 사용자가 계정 선택을 취소한 경우 제외한다.

저장 위치는 Firebase Realtime Database의 `seedWebTelemetry/v1/days/YYYYMMDD`다. 게임 계정과 별도의 익명 인증을 쓰며 이름·이메일·점수·조합·상세 오류 문구를 보내지 않는다. 집계 통신이 실패해도 게임과 계정 기능에는 영향을 주지 않는다. Android 앱과 localhost에서는 초기화하지 않는다.

## 시작 조건

1. Firebase Console의 현재 **Realtime Database 규칙을 먼저 백업**한다. 저장소의 전체 규칙 파일은 오래된 항목이 있을 수 있으므로 통째로 덮어쓰지 않는다.
2. 현재 규칙의 `rules` 안에 `docs/firebase-rules-with-seed.json`의 `seedWebTelemetry` 블록만 추가하고 게시한다. 다른 경로의 규칙은 유지한다. 이 경로는 클라이언트 읽기를 막고 인증된 익명 UID가 자기 경로에 `true`만 쓰도록 제한한다.
3. 새 웹 빌드를 게시한 뒤 실제 웹 주소에서 한 번 방문하고 전투를 시작한다. 로컬 `?inspect=1`은 집계하지 않는다.
4. Firebase Console 데이터 탭의 `seedWebTelemetry/v1/days`에서 새 날짜 노드를 확인한다. 관리 서비스 계정이 설정된 컴퓨터라면 `node tools/web-telemetry-report.mjs --days=14`로 이름 없는 집계표를 출력할 수 있다.

코드만 배포하거나 규칙만 게시한 상태에서는 수집이 시작되지 않는다. 게시 이전 웹 방문은 복구할 수 없다.
