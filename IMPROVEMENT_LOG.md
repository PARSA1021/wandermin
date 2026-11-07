# IMPROVEMENT_LOG — 수정 내역

## 데이터 보호 (P0·P1)

| 파일 | 변경 | 이유 | 기대 효과 |
|---|---|---|---|
| `src/store/state.ts` | `readState()`와 `sanitize()` 추가: 모르는 출발 도시는 새 여행으로(설정 유지), 경로는 첫 번째 모르는 도시 앞에서 자름, 잘못된 기록·진행 세션·도착 대기는 제외. 데이터를 잃었는지 `lost`로 알려 줌. `parseBackup`은 모르는 도시가 있으면 거절 | WM-001: 모르는 도시 하나로 앱이 영구 정지 | 도시 데이터가 바뀌거나(도시 추가·이름 변경) 파일이 손상돼도 앱이 항상 열림 |
| `src/store/AppProvider.tsx` | 불러온 데이터에 손실이 있으면 원본을 `wandermin.v1.unreadable`에 먼저 보관하고 안내를 띄움 | WM-003: 손상된 데이터가 조용히 덮어써짐 | 사용자 기록이 아무도 모르게 사라지는 일이 없음 |
| `src/components/Notice.tsx`, `src/components/Onboarding.tsx` | "저장된 기록 일부를 읽지 못했어요" 안내와 "원본 확인하기" 버튼. 새 여행으로 시작되는 경우에도 첫 화면에 표시 | 사용자가 상황을 알아야 함 | 무슨 일이 있었는지, 어디서 확인할지 알 수 있음 |
| `src/app/profile/page.tsx` | 읽지 못한 원본이 있으면 "원본 파일로 저장 / 보관한 원본 지우기" 표시. 다운로드 코드를 공용 함수로 정리(DOM에 붙여 클릭, URL 해제) | WM-003, WM-010 | 원본 복구 가능, 다운로드 안정성 |
| `src/app/error.tsx`, `src/app/global-error.tsx`, `src/components/CrashScreen.tsx` | 오류 복구 화면(한/영 안내, 다시 시도, 홈으로, 기록 파일로 저장). 앱 상태 관리가 고장 나도 동작하도록 의존성 없이 작성 | WM-002: 오류 시 빈 화면 | 어떤 오류에서도 사용자가 빠져나갈 길과 기록 보존 수단이 있음 |
| `tests/recovery.test.ts` | 회귀 테스트 5개 | 같은 문제 재발 방지 | |

## 화면·접근성 (P1·P2)

| 파일 | 변경 | 이유 |
|---|---|---|
| `src/app/focus/page.tsx`, `src/app/globals.css` | 소등 모드를 고정 오버레이 대신 `<html data-calm>`으로 페이지 전체 배경을 바꾸는 방식으로 교체, 사이드바도 숨김. 배경 전환 효과는 비행 화면에만 적용(`data-calm-fx`) | WM-004: 태블릿·데스크톱에서 일부만 어두워짐. 첫 수정에서 생긴 테마 전환 지연도 함께 해결 |
| `src/app/page.tsx` | 진행률 막대에 이름("다음 목적지: ○○") | WM-005 |
| `src/components/WorldMap.tsx` | 현재 위치 표시에 `role="img"` | WM-006 |
| `src/components/CollectionBoard.tsx` | 지역 탭 숫자의 흐림 제거(대비 확보) | WM-007 |
| `src/app/profile/page.tsx` | 언어·기본 세션 길이 선택상자에 이름 | WM-008 |
| `src/app/focus/page.tsx` | 화면 낭독기용 h1 "집중" | WM-009 |

## 코드 품질 (P3)

| 파일 | 변경 |
|---|---|
| `eslint.config.mjs`, `package.json` | ESLint 9 + `eslint-config-next` 도입(개발 전용), `npm run lint`, `npm run check`에 포함. `<img>` 규칙은 근거를 적고 끔(기기에서 만든 픽셀 이미지라 next/image가 흐리게 만들고 blob URL도 최적화하지 못함) |
| `src/features/map/projection.ts` | `let` → `const`(lint 오류) |
| `src/features/art/render.ts`, `scenes/athens·cape-town·vancouver·singapore·paris.ts` | 쓰지 않는 import 제거 |
| `tests/i18n.test.ts` | `any` 제거 |
| `next.config.mjs`, `postcss.config.mjs` | 이름 있는 export(lint 경고) |
| `e2e/` | 그동안 작업 공간에만 있던 브라우저 테스트 14종을 저장소로 옮기고 실행 방법을 문서화. Chrome 경로는 환경변수(`WM_CHROME`)로 |

## 결과 요약

- **앱이 멈추던 경로:** 2개 제거. 손상 데이터 5가지 유형 모두에서 앱이 열리고, 원본이 보관되며, 사용자에게 안내됩니다.
- **접근성:** axe 위반 5종 → 0(밝은·어두운 모드, 8개 화면).
- **정적 검사:** ESLint 오류 3·경고 14 → 0.
- **테스트:** 단위 204 → 209. 브라우저 스위트를 저장소로 옮김.
- **성능:** 이전 버전과 같은 조건 비교에서 변화 없음(회귀 없음).

## 아이콘·버전 업데이트 (2026-11-07 추가)

| 파일 | 변경 | 이유 |
|---|---|---|
| `scripts/render-icons.ts`, `public/icons/*`, `src/app/icon.png`, `src/app/apple-icon.png` | 새 아이콘: 집중 화면의 둥근 비행기 창(노을 하늘·구름·날개)을 빨간 타이머 링이 감싸고, 링 끝에 작은 비행기가 달림. 마스커블 안전 영역 안에 배치하고, 32px 파비콘은 따로 단순화해서 그림 | 앱의 정체성(집중 타이머 + 비행 + 픽셀 엽서)을 한눈에 |
| `scripts/render-splash.ts`, `public/splash/*`, `public/og.png` | 새 아이콘으로 다시 생성(64px 원본에 맞게 viewBox 수정) | 일관성 |
| `src/app/manifest.ts` | 아이콘 주소에 `?v=2` | 설치된 앱의 아이콘 캐시 갱신 |
| `next.config.mjs` | 빌드 ID(커밋)와 빌드 시각을 앱에 주입, `/version.json` 캐시 금지 | 버전을 화면에 보여 주고 비교하기 위해 |
| `src/app/version.json/route.ts` | 지금 배포된 빌드를 알려 주는 주소 | 열려 있는 앱이 새 버전을 알아차리기 위해 |
| `public/sw.js`, `src/components/ClientRoot.tsx` | 서비스 워커를 `/sw.js?v=<빌드>`로 등록하고 캐시 이름도 빌드별로. `version.json`은 캐시하지 않음 | 이전에는 `wm-v4`로 고정돼 있어서 배포해도 새 버전으로 인식되지 않았음("새 버전이 준비됐어요"가 뜨지 않던 원인) |
| `src/components/updates.ts`, `src/components/AppSignals.tsx` | 시작 3초 후, 앱으로 돌아올 때, 30분마다 새 빌드를 확인. 있으면 "새 버전이 나왔어요 · 지금 업데이트"(비행 중 집중 화면에서는 띄우지 않음). 업데이트하거나 새로고침으로 새 버전이 열리면 "새 버전으로 업데이트됐어요 · 날짜 · 빌드" | 업데이트 여부를 알고 바로 적용할 수 있게 |
| `src/components/AboutApp.tsx`, `src/app/profile/page.tsx` | 설정 › 앱 정보: 현재 버전, "업데이트 확인" 버튼(최신/새 버전/오프라인 안내), 새 버전이면 "지금 업데이트" | 사용자가 직접 확인·적용 |
| `e2e/update.py` | 두 번 빌드해 실제 업데이트 과정을 검증(비행 중 업데이트 포함, 12/12) | 회귀 방지 |
