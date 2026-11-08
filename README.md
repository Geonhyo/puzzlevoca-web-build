# 퍼즐보카 웹

하루 한 판, 영단어가 쌓여요 — https://puzzlevoca.com

매일 자정(KST) 새로 열리는 영단어 크로스워드의 웹 프런트엔드예요 (Next.js).

> 이 저장소는 비공개 원본 저장소의 `web/` 폴더를 자동으로 복사한 **읽기용 미러**예요.
> 여기서 직접 수정하거나 PR 을 받지 않아요. API 서버 코드는 공개하지 않아요.

## 구성

- `src/app` — 페이지 (홈, 게임, 결과, 일일 랭킹, 프로필), SEO (메타·OG 이미지·sitemap·robots)
- `src/game` — 게임 화면
- `src/shared` — 게임 규칙·점수 계산, 티어 규칙 (서버도 같은 규칙으로 기록을 다시 계산해요)
- `src/styles/tokens.css` — 디자인 토큰
- `e2e` — Playwright 화면 테스트

## 로컬 실행

API 서버가 필요해요. `.env.example` 을 `.env` 로 복사해 `API_URL` 을 API 주소로 바꾼 뒤:

```bash
pnpm install
pnpm dev   # http://localhost:3000
```
