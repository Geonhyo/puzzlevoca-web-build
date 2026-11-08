/** next/og 는 한글 글꼴이 없어서 Google Fonts 에서 필요한 글자만 받아 쓴다 (빌드 시 1회). */
export async function loadKoreanFont(text: string, weight = 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}
