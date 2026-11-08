/** 환경 변수 (.env / .env.prod). NEXT_PUBLIC_* 는 빌드 시 코드에 들어간다. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const SITE_NAME = '퍼즐보카';
export const TAGLINE = '하루 한 판, 영단어가 쌓여요';
export const SITE_DESCRIPTION = '매일 자정 새로 열리는 영단어 크로스워드 퍼즐. 뜻과 예문을 보고 칸을 채우다 보면 토익·비즈니스 영단어가 하루 한 판씩 쌓여요. 콤보와 일일 랭킹, 티어로 꾸준히 이어가세요.';
