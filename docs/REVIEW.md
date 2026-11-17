# 머릿결사랑 이미지·모션 개선 검토

기존 HTML·CSS·JavaScript 정적 홈페이지를 유지하면서 살롱 메인 이미지와 움직임 제어를 개선했습니다. 운영 배포는 하지 않았습니다.

## 기준점

- 저장소: [ssunmo/hairlove-franchise](https://github.com/ssunmo/hairlove-franchise)
- 변경 전 커밋: [`03290fa158e094b40ba3987a69f628529e878e9e`](https://github.com/ssunmo/hairlove-franchise/commit/03290fa158e094b40ba3987a69f628529e878e9e)
- GitHub 최신 `main`을 새로 복제했으며, 미커밋 변경은 없었습니다. 저장소와 상위 작업 디렉터리에서 `AGENTS.md`는 발견되지 않았습니다.
- 작업 브랜치: `codex/salon-motion-preview`. 운영 GitHub Pages 소스는 `main`의 `/`입니다.
- 이 문서를 포함한 변경 커밋은 `git rev-parse HEAD`로 확인할 수 있습니다.

## 변경 사항

- 아이보리 벽, 딥그린 의자, 우드 가구, 따뜻한 햇살을 담은 살롱 콘셉트 이미지를 새로 생성했습니다. 실제 가맹점 촬영 사진이 아닌 AI 생성 이미지입니다.
- 원본 크기는 1672×941px이며, 웹에서는 약 132KiB의 WebP를 사용합니다. 세로로 잘라 표시하는 모바일에서도 원본 해상도를 유지합니다. 메인 이미지는 우선 로드하고 제품 포스터는 지연 로드합니다.
- 제목과 버튼은 고정하고 배경에만 26초 왕복 확대·이동을 적용했습니다. 제목 뒤의 밝은 그라데이션으로 가독성을 확보했습니다.
- 메인과 제품 영역에 동기화된 정지·재생 버튼을 제공하고 선택을 저장합니다. 화면 밖·숨겨진 탭·열린 메뉴/모달에서는 반복 효과가 멈춥니다.
- `prefers-reduced-motion`을 처음 로드할 때와 실행 중 변경할 때 모두 반영합니다. 모션 감소가 켜져 있으면 효과와 부드러운 스크롤을 끄고 조작 버튼에 상태를 표시합니다.
- 제품 포스터는 자르지 않고 전체를 보여 줍니다. 18초의 작은 움직임은 마우스를 올리거나 키보드 포커스를 받으면 멈추고, 확대 버튼의 위치는 고정됩니다.
- 1100px에서 제목·버튼을 왼쪽으로 밀던 음수 여백을 제거했습니다. 비용 표와 푸터의 백분율 열 너비에 간격이 더해져 넘치던 문제도 수정했습니다.
- 모바일 메뉴 상태, FAQ 펼침 상태, 포스터 키보드 열기·Escape 닫기·포커스 복귀를 보강했습니다. 기존 브랜드 문구, 제품 이미지, 상담 연락처와 문의 전송 흐름은 유지했습니다.

## 검증 결과

Chromium에서 저장소 파일을 HTTP 응답으로 연결하여 아래 화면 크기를 검증했습니다. 운영 사이트 파일을 변경하거나 문의 API에 실제 요청을 보내지 않습니다.

| 화면 너비 | 이미지·제목·버튼·가로 넘침 | 정지/재생·화면 밖 정지·모션 감소 | 메뉴·FAQ·제품 확대 | 문의 모의 응답 |
| --- | --- | --- | --- | --- |
| 360px | 통과 | 통과 | 통과 | 통과 |
| 390px | 통과 | 통과 | 통과 | 통과 |
| 768px | 통과 | 통과 | 통과 | 통과 |
| 1100px | 통과 | 통과 | 통과 | 통과 |
| 1440px | 통과 | 통과 | 통과 | 통과 |

- 정지 후 애니메이션 시간이 멈추고 재생 시 이어지는지, 새로고침 후 정지 설정이 유지되는지 확인했습니다.
- 화면 밖 정지는 실제 스크롤과 IntersectionObserver로, 숨겨진 탭 처리는 합성 `visibilitychange` 이벤트로 확인했습니다.
- 모션 감소 설정에서 첫 로드/실행 중 전환, 제품의 호버/키보드 포커스 정지, JavaScript가 꺼진 경우의 본문 표시를 확인했습니다.
- 문의 폼은 필수값·개인정보 동의·전화번호 자동 형식·성공·서버 오류·네트워크 오류를 확인했습니다. 모든 API 요청은 브라우저에서 모의 응답으로 처리했으며 실제 이메일 발송은 **0건**입니다.
- 390px, DPR 2에서도 고해상도 이미지 선택·로딩을 별도로 확인했습니다.
- [자동 검증 기록](preview/verification.json), JavaScript 구문 검사, `git diff --check`를 통과했습니다. 화면 크기 검증은 브라우저 에뮬레이션입니다.

## 화면과 영상

공유 클라우드 미리보기는 환경의 relay/browser 연결 오류로 제공할 수 없었습니다. 아래는 저장소에서 열거나 다운로드할 수 있는 실제 브라우저 캡처입니다. MP4에는 소리가 없습니다.

- [PC MP4 — 26초 이미지 왕복, 정지·재생, 제품 확대](preview/desktop-preview.mp4?raw=true)
- [모바일 MP4 — 이미지, 정지·재생, 메뉴, 제품 확대](preview/mobile-preview.mp4?raw=true)
- [PC 1440px](preview/hero-1440.png) · [1100px](preview/hero-1100.png) · [768px](preview/hero-768.png)
- [모바일 390px](preview/hero-390.png) · [360px](preview/hero-360.png) · [390px 고밀도 화면](preview/mobile-retina.png)
- [변경 전 1100px](preview/before-1100.png)
- [PC 제품 포스터](preview/product-1440.png) · [모바일 제품 포스터](preview/product-390.png)

## 다시 검증하기

홈페이지 자체에는 설치나 빌드가 필요하지 않습니다. `package.json`의 Playwright는 검증용 개발 의존성입니다.

```bash
npm ci
npx playwright install chromium
npm test
```

설치된 시스템 Chromium을 사용할 수도 있습니다.

```bash
CHROMIUM_PATH=/usr/bin/chromium npm test
```

브라우저 캡처를 MP4로 다시 만들려면 FFmpeg가 필요합니다.

```bash
CHROMIUM_PATH=/usr/bin/chromium node tests/record-preview.cjs
```

결과는 기본적으로 Git에서 제외된 `test-results/`에 저장됩니다. `TEST_OUTPUT`으로 다른 출력 디렉터리를 선택할 수 있습니다. 검증·영상 생성 스크립트는 모든 문의 요청을 가로채며, 실제 이메일을 보내지 않습니다.

운영 반영은 이 변경 사항 검토와 별도 배포 승인 후 진행합니다.
