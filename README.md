# Polygon Statement Editor — Static GitHub Pages version

Vite/Node/npm가 필요 없는 순수 정적 사이트입니다..

## 사용

파일 전체를 GitHub 저장소에 올린 뒤 GitHub Pages에서 `main` 브랜치의 root를 배포하면 됩니다.

- `Save`: 현재 문제를 브라우저 localStorage에 저장
- `Load`: localStorage에 저장된 마지막 문제 불러오기
- `Export`: 현재 문제를 JSON 파일로 다운로드
- `Import`: JSON 파일에서 문제 불러오기
- 자동 저장: 입력할 때마다 localStorage에 저장
- `Edit & Preview`: 편집/미리보기 동시 표시
- `Edit`: 편집만
- `Preview`: 미리보기만

LaTeX 렌더링은 jsDelivr의 KaTeX CDN을 사용하므로 GitHub Pages 접속 시 인터넷 연결이 필요합니다.
