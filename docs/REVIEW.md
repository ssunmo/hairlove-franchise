# 머릿결사랑 — 따뜻한 살롱 디자인

인물 중심의 살롱 사진, 차콜·크림·구리색, 큰 제목과 여백으로 승인된 디자인 시안을 구현했습니다. 제품 → 브랜드 이야기 → 창업 정보 → 상담 순서로 이어지며, 기존 정적 HTML·CSS·JavaScript 구조를 유지합니다.

## 보관한 운영 원본

- 기준 커밋: [`2cbcf8d69e43fb66b41042990b1b8d6ff72ab6a7`](https://github.com/ssunmo/hairlove-franchise/commit/2cbcf8d69e43fb66b41042990b1b8d6ff72ab6a7)
- 원격 백업 태그: [`backup/before-warm-salon-20261123`](https://github.com/ssunmo/hairlove-franchise/tree/backup/before-warm-salon-20261123)
- 작업 브랜치: `codex/warm-salon-redesign`
- 시작 시 미커밋 변경은 없었습니다. 최신 `origin/main`을 기준으로 별도 브랜치를 만들었습니다.

## 변경 내용

- 고객과 스타일리스트가 등장하는 메인 사진과 제품 연출 사진을 새로 준비했습니다. 모바일에서는 인물을 위쪽에, 제목과 상담 링크를 아래쪽에 배치합니다.
- 제품 사진과 설명을 교차 배치하고 성분·컬러·케어 설명은 펼쳐 읽을 수 있게 정리했습니다. 짙은 브랜드 소개, 밝은 창업 정보, 짙은 상담 영역으로 페이지 흐름을 구성했습니다.
- 기존 로고, 저자극 건강 염색이라는 브랜드 메시지, 제품·창업 비용·FAQ·연락처·문의 필드와 전송 서비스를 유지합니다. 제품 상세 포스터 원본도 보존합니다.
- 제품 사진을 클릭·터치하거나 Enter·Space를 누르면 기존 상세 포스터가 열립니다. 별도의 ‘포스터 크게 보기’ 문구·돋보기·재생/정지 버튼은 없습니다.
- 본문 건너뛰기 링크, 키보드 포커스 표시, 모바일 표 스크롤을 지원합니다. 작은 구리색 글자도 크림 배경과 4.5:1 이상의 대비를 확보했습니다.
- CSS·JavaScript 참조 버전을 `4.0`으로 올렸습니다. 빌드 도구나 프레임워크는 추가하지 않았습니다.

## 이미지와 움직임

- 메인 사진은 24초 동안 천천히 확대·이동했다 돌아오며, 22초의 따뜻한 조명 변화가 겹칩니다. 제목과 상담 버튼의 위치는 고정됩니다.
- 제품 사진은 움직이지 않고 16초 주기의 얕은 반사광만 지나갑니다. 호버·키보드 포커스 중에는 반사광이 멈춥니다.
- 화면 밖, 숨겨진 탭, 메뉴·확대창·문의 완료창 표시 중에는 반복 효과가 멈춥니다. 기기의 `prefers-reduced-motion`을 첫 로드와 실행 중 변경 모두에 반영합니다.
- 신규 WebP 자산 6개는 합계 약 300KiB입니다. 메인 사진은 약 74KiB이며, 제품 사진에는 반응형 소스와 지연 로딩을 적용했습니다. 홈페이지에서 영상 파일을 다운로드하거나 재생하지 않습니다.
- 메인 인물·제품 연출 이미지는 생성 이미지입니다. 제품 연출 이미지는 기존 포스터를 참고한 재구성이며 실물 촬영본이 아닙니다. 클릭 후 표시하는 상세 포스터는 기존 원본입니다. 브랜드 소개의 실내 이미지 역시 살롱 콘셉트 이미지입니다.

## 검증

설치된 Chromium에서 프로젝트 파일을 브라우저 응답으로 연결해 검증했습니다. 문의 API는 성공·서버 오류·네트워크 오류를 모두 모의 처리했으며, 실제 이메일 발송은 0건입니다.

| 화면 너비 | 이미지·제목·버튼 경계 | 장면 모션·감소 설정 | 메뉴·FAQ·이미지 확대 | 문의 모의 응답 |
| --- | --- | --- | --- | --- |
| 360px | 통과 | 통과 | 통과 | 통과 |
| 390px | 통과 | 통과 | 통과 | 통과 |
| 768px | 통과 | 통과 | 통과 | 통과 |
| 1100px | 통과 | 통과 | 통과 | 통과 |
| 1440px | 통과 | 통과 | 통과 | 통과 |

- 이전 문제가 있던 1100px을 포함해 제목·버튼 잘림, 버튼 겹침, 페이지 가로 넘침이 없습니다.
- 이미지 로딩, 실제 장면 움직임과 제목 고정, 화면 밖 정지·복귀, 호버·포커스 정지, 모션 감소 첫 렌더·실행 중 변경을 확인했습니다. 숨겨진 탭 처리는 합성 `visibilitychange` 이벤트로 검사했습니다.
- 두 제품 모두 클릭·모바일 터치·Enter·Space로 상세 포스터가 열립니다. 닫기·Esc·배경 클릭, Tab 포커스 유지, 원래 이미지로 포커스 복귀, 스크롤 잠금 해제를 확인했습니다.
- 모바일 메뉴, FAQ, 제품·브랜드 상세 펼치기, 필수값·개인정보 동의·전화번호 자동 형식·모의 전송 성공·오류를 확인했습니다.
- JavaScript를 끈 경우에도 본문이 보이고 반복 모션은 정지 상태입니다.
- JavaScript 구문, HTML 중첩, `git diff --check`를 확인했습니다. 화면 크기는 브라우저 에뮬레이션으로 검증했으며 실물 기기 검증은 아닙니다.
- [자동 검증 기록](preview/verification.json)

## 실제 화면과 영상

아래 자료는 구현한 홈페이지의 Chromium 캡처입니다. 디자인 예상 이미지가 아닙니다. 관리형 실시간 미리보기는 릴레이 연결 오류로 열리지 않아, GitHub에서 열고 다운로드할 수 있는 화면·영상으로 제공합니다.

- 첫 화면: [PC 1440px](preview/hero-1440.png) · [1100px](preview/hero-1100.png) · [768px](preview/hero-768.png) · [모바일 390px](preview/hero-390.png) · [360px](preview/hero-360.png)
- 전체 페이지: [PC](preview/full-1440.png) · [모바일](preview/full-390.png)
- 제품: [PC](preview/product-1440.png) · [모바일](preview/product-390.png)
- 상담: [PC](preview/inquiry-1440.png) · [모바일 폼](preview/form-390.png)
- [24초 첫 화면 모션 GIF](preview/salon-light-preview.gif?raw=true)
- [PC MP4](preview/desktop-preview.mp4?raw=true) · [모바일 MP4](preview/mobile-preview.mp4?raw=true): 실제 속도의 모션, 메뉴 이동, 이미지 클릭 확대를 기록했습니다.

## 다시 검증하기

홈페이지 자체에는 설치나 빌드가 필요하지 않습니다. Playwright는 검증용 개발 의존성입니다.

```bash
npm ci
npx playwright install chromium
npm test
```

설치된 시스템 Chromium을 사용할 수도 있습니다.

```bash
CHROMIUM_PATH=/usr/bin/chromium npm test
CHROMIUM_PATH=/usr/bin/chromium node tests/capture-design.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/record-preview.cjs
```

영상 기록에는 FFmpeg가 필요합니다. 결과는 Git에서 제외된 `test-results/`에 저장됩니다. `TEST_OUTPUT`으로 출력 디렉터리를 선택할 수 있습니다. 모든 스크립트는 문의 요청을 가로채며 실제 이메일을 보내지 않습니다.
