# Polygon Statement Editor — Static GitHub Pages version

Vite/Node/npm가 필요 없는 순수 정적 사이트입니다. 

## 기능

- **LaTeX.js 엔진**: 모든 종류의 LaTeX 문법, 환경(\begin{equation}), 마크업 및 수학 수식을 완벽히 지원합니다.
- **Share (공유하기)**: 현재 작성 중인 문제 상태를 Base64 URL Hash(`#share={encoded}`)로 생성해 복사합니다. 해당 링크 접속 시 바로 작성된 상태로 불러와집니다.
- **Save / Load**: 브라우저 `localStorage`에 문제 데이터를 이름을 지정해 저장하고 언제든 불러옵니다.
- **Export / Import**: 문제 데이터를 JSON 파일로 다운로드하거나 불러옵니다.
- **자동 저장**: 입력할 때마다 `localStorage`에 Draft 상태로 실시간 반영됩니다.
- **다양한 뷰 모드**: `Edit & Preview` (분할), `Edit` (편집기만), `Preview` (미리보기만) 선택 가능.
