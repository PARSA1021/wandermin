# PROJECT_AUDIT — WANDERMIN 전체 구조·기술 스택 진단

작성일: 2026-11-07 · 기준 커밋: `381d652` 이후 감사 작업분

## 1. 서비스 요약

WANDERMIN은 집중한 1분을 50km 비행으로 바꾸는 집중 타이머 PWA입니다. 실제 도시 50곳(39개국, 항로 106개)을 여행하며 도착할 때마다 픽셀 아트 엽서와 여권 도장을 모읍니다.
- **계정·서버:** 가입·로그인·서버·데이터베이스가 없습니다. 모든 데이터는 사용자의 기기(브라우저 `localStorage`)에 저장됩니다.
- **배포:** Vercel에 정적·서버 렌더링으로 배포합니다(`https://wandermin.vercel.app`).

## 2. 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router), React 19, TypeScript strict |
| 스타일 | Tailwind CSS 4 (`@theme`, 사용자 정의 variant `short`/`wideland`/`tiny`) |
| 상태 | React Context + 순수 reducer (`src/store/state.ts`), `localStorage` 영속화, 탭 간 `storage` 이벤트 동기화 |
| 그래픽 | 자체 픽셀 캔버스 엔진(`features/postcards/pixel`), Web Worker 렌더링 + OffscreenCanvas PNG 인코딩, Cache Storage 캐시 |
| PWA | 수동 Service Worker(`public/sw.js`, `wm-v4`), Web App Manifest, Media Session(잠금 화면 카드), Wake Lock, Notifications |
| 다국어 | 자체 i18n(ko/en/ja, 키·플레이스홀더 일치 테스트) |
| 테스트 | Vitest 단위 테스트 12파일, Playwright(Python) 브라우저 스위트 14종(`e2e/`) |
| 품질 | `tsc --noEmit`, ESLint 9 + `eslint-config-next`(이번 감사에서 도입) |

## 3. 폴더 구조와 역할

```
src/
  app/            페이지(App Router): / · /focus · /map · /journal · /profile · not-found · error · global-error
  components/     화면 구성 요소(Shell, BottomSheet, Onboarding, ArrivalSheet, WindowView, Pickers …)
                  + 클라이언트 유틸(artClient, backStack, cabin, lockArt, session, hooks)
  features/
    focus/        타이머 상태 기계(타임스탬프 기반, 새로고침·잠금에도 정확)
    travel/       여정 계산(journey), 항로 그래프, 다음 목적지(next), 도시 검색(search), 현지 시각(localTime)
    tickets/      탑승권 데이터·렌더링
    postcards/    엽서 템플릿, 픽셀 캔버스·폰트, 도시별 장면 50개
    art/          워커 작업 정의·렌더러·흐림 처리
    map/          세계 지도 투영·해안선 데이터
  data/           cities.json(시간대 포함), countries.json, routes.json
  i18n/           메시지 3개 언어, 런타임
  store/          AppState·reducer·저장/복구
tests/            Vitest 단위 테스트
e2e/              실제 브라우저 테스트 스위트와 실행 방법
scripts/          아이콘·스플래시·OG·샘플 이미지 생성 스크립트
public/           sw.js, 오디오, 아이콘, 스플래시, 스크린샷
```

## 4. 데이터 구조

`AppState`(버전 키 `wandermin.v1`):
- `plan`: 출발 도시와 목적지 목록. `addedAt`을 두어, 나중에 추가한 구간에 예전 집중 시간이 소급 적용되지 않게 합니다.
- `ledger`: 완료된 집중 세션(append-only). 여정·도착·도장·통계는 모두 여기서 계산하며 따로 저장하지 않습니다.
- `active`: 진행 중 세션(시작 시각·일시정지 누적 등 타임스탬프만 저장).
- `settings`, `pendingArrivals`, `notice`, `undo`, `draftNote`, `noteReview`.

백업은 상태 전체를 JSON으로 내보내고, 불러올 때 `parseBackup`으로 검증합니다.

## 5. 해당 없음으로 분류한 감사 항목

감사 지침의 다음 항목은 이 서비스에 존재하지 않아 테스트하지 않았습니다. 존재하지 않는 기능을 만들어 테스트하지 말라는 지침에 따른 것입니다.
- 회원가입·로그인·로그아웃·비밀번호·세션 만료
- 서버 API·데이터베이스·서버 측 입력 검증·SQL Injection
- 사용자 권한·사용자 간 데이터 접근

대신 데이터가 실제로 저장되는 곳(기기 저장소, 백업 파일, 탭 간 동기화)을 같은 기준(생성·조회·수정·삭제, 새로고침 유지, 손상·예외)으로 검증했습니다.

## 6. 코드 진단 결과

| 항목 | 결과 |
|---|---|
| 미사용 파일 | 없음. 가져오지 않는 모듈은 워커(`art.worker.ts`, `new URL()`로 로드)뿐입니다. |
| 미사용 export | 같은 파일 안에서만 쓰는 export 30여 개. 기능 영향은 없고 정리 대상(P3)입니다. |
| 중복 구현 | 목적지 선택 로직이 Pickers 한 곳으로 모였습니다(`useNextTrip`). 다운로드 코드도 설정 화면에서 공용화했습니다. |
| 비대한 컴포넌트 | `app/focus/page.tsx`(약 280줄)가 가장 큽니다. 비행 중 화면과 설정 화면을 분리하면 좋습니다(REMAINING_ISSUES 참고). |
| 보안 | 비밀키·환경변수 없음. `dangerouslySetInnerHTML`은 레이아웃의 고정 테마 스크립트 1곳뿐(사용자 입력 없음). 사용자 입력(메모·활동명·백업)은 React가 텍스트로만 출력합니다(검증 완료). 보안 헤더(nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy)가 설정돼 있습니다. |
| 예외 처리 | **발견 및 수정:** 저장 데이터나 백업 파일에 모르는 도시가 들어 있으면 앱 전체가 영구히 멈추는 문제(P0)와, 화면 오류 시 빈 화면만 남는 문제(P0)가 있었습니다. 상세는 IMPROVEMENT_LOG 참고. |
| 성능 | 비행 중 1초 단위 렌더, 소등 모드에서 초당 약 2회 다시 그리기, 아트 렌더링·PNG 인코딩은 워커에서 처리, 긴 목록은 `content-visibility`. |
| 개발·배포 환경 차이 | Service Worker는 production에서만 등록됩니다. 개발 서버에서는 오프라인 동작을 확인할 수 없으므로, 모든 브라우저 테스트는 production 빌드(`next start`)로 했습니다. |
| 정적 검사 | 도입 당시 ESLint 오류 3개·경고 14개 → 현재 0개. TypeScript 오류 0개. |

## 7. 기능 목록(검증 대상)

1. 첫 방문 소개와 3단계 온보딩(언어, 출발 도시, 첫 목적지)
2. 홈: 다음 목적지·진행률·바로 시작·첫 여행 가이드·최근 엽서·통계
3. 집중: 시간·활동·할 일 설정, 이륙 연출, 창밖 풍경, 일시정지·지금 마치기·기록 없이 그만두기, 휴식, 소등 모드
4. 도착: 도장 연출, 엽서, 현지 시각, 다음 비행 원탭 출발, 공유
5. 목적지: 추천·새 나라·도시 검색(초성 포함), 경로 변경
6. 지도: 내 경로·전체 세계, 여정 목록
7. 엽서함: 컬렉션(지역 필터, 못 간 도시 정보), 여권 도장, 통계, 탑승권, 최근 세션
8. 설정: 언어, 테마, 창밖 풍경, 기본 길이, 모션 줄이기, 출발 도시, 사용법, 설치, 잠금 화면 옵션, 백업 저장·불러오기·전체 삭제, 읽지 못한 원본 저장
9. PWA: 설치, 오프라인, 업데이트 알림, 앱 배지, 잠금 화면 카드, 착륙 알림
