import { expect, test } from '@playwright/test';
import { login, selectedKey, shot, signup, solveByKeyboard, todayPuzzle, uid } from './helpers';

test.describe('SEO', () => {
  test.skip(({ isMobile }) => isMobile, '한 번만');

  test('홈은 서버에서 그려지고 메타/구조화 데이터가 있다', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('<html lang="ko"');
    expect(html).toContain('<title>퍼즐보카 · 하루 한 판, 영단어가 쌓여요</title>');
    expect(html).toMatch(/<meta name="description" content="매일 자정 새로 열리는 영단어 크로스워드 퍼즐/);
    expect(html).toMatch(/<link rel="canonical" href="http:\/\/localhost:3000"/);
    expect(html).toMatch(/<meta property="og:image"/);
    expect(html).toMatch(/<meta property="og:locale" content="ko_KR"/);
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"WebApplication"');
    // 실제 내용이 HTML 에 있음 (JS 없이도 읽힘)
    expect(html).toContain('오늘의 영어 퍼즐이 열렸어요');
    expect(html).toContain('일일 랭킹');
    expect(html).toContain('word_cat');
    // 정답 단어는 HTML 에 없어야 한다
    const { board } = await (async () => { const r = await request.get('http://localhost:8000/api/puzzles/today'); return { board: await r.json() }; })();
    for (const w of board.words) expect(html).not.toContain(w.answer);

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /play');
    expect(robots).toContain('Sitemap: http://localhost:3000/sitemap.xml');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>http://localhost:3000/ranking</loc>');
    const og = await request.get('/opengraph-image');
    expect(og.headers()['content-type']).toContain('image/png');
    const result = await (await request.get('/result')).text();
    expect(result).toMatch(/<meta name="robots" content="noindex/);
  });
});

test('비로그인: 미스·조커 → 끝까지 풀기 → 결과 → 공유 카드', async ({ page }, info) => {
  const tag = info.project.name;
  const { board } = await todayPuzzle(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('오늘의 영어 퍼즐이 열렸어요');
  await expect(page.getByRole('button', { name: '로그인' }).first()).toBeVisible();
  await shot(page, `${tag}-01-home`);

  await page.getByRole('link', { name: '시작하기' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await expect(page.locator('.cell.sel')).toHaveCount(1);
  await expect(page.locator('.clue .cko')).not.toBeEmpty();
  await shot(page, `${tag}-02-play`, false);

  // 일부러 틀리기: 콤보 0, −15
  const key = (await selectedKey(page))!;
  const wrong = [...new Set(board.keys.map(k => board.cells[k].ans))].find(L => L !== board.cells[key].ans)!;
  await page.keyboard.press(wrong);
  await expect(page.locator('.float.bad .pts').first()).toHaveText('−15');
  await expect(page.locator('.stats .stat').nth(1).locator('b')).toHaveText('0');

  // 맞히면 점수·콤보가 오른다
  await page.keyboard.press(board.cells[key].ans);
  await expect(page.locator('.stats .stat').nth(1).locator('b')).toHaveText('1');

  // 조커: 선택된 칸을 연다
  const jkKey = (await selectedKey(page))!;
  await page.getByRole('button', { name: /^조커/ }).click();
  const [r, c] = jkKey.split(',').map(Number);
  await expect(page.getByRole('button', { name: new RegExp(`^${r + 1}행 ${c + 1}열`) })).toHaveClass(/joker/);
  await expect(page.locator('.key.jk .badge')).toHaveText('1');

  // 도움말 (일시정지 안에서)
  await page.getByRole('button', { name: '일시정지' }).click();
  await expect(page.locator('.pauseBox')).toBeVisible();
  await shot(page, `${tag}-03-pause`, false);
  await page.getByRole('button', { name: '도움말' }).click();
  await expect(page.locator('.overlay.rules .rule')).toHaveCount(8);
  await page.getByRole('button', { name: '확인' }).click();
  await page.getByRole('button', { name: '계속하기' }).click();

  await solveByKeyboard(page);
  await expect(page).toHaveURL(/\/result$/);
  // 끝나면 알림 팝업
  const popup = page.getByRole('dialog', { name: '다음 퍼즐 알림' });
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('첫 영어 퍼즐 완료!');
  await shot(page, `${tag}-04-popup`, false);
  await popup.locator('button.btn.line').click();

  await expect(page.locator('.s-score .s-big')).toContainText('점');
  await expect(page.locator('.s-pct')).toHaveText(/명 중 \d+등|상위 \d+%/);
  await expect(page.locator('.word .tg', { hasText: '미스' })).toHaveCount(1);
  await expect(page.locator('.word .tg.j')).toHaveCount(1);
  await expect(page.getByText('미스 1회')).toBeVisible();
  await shot(page, `${tag}-05-result`);

  await page.getByRole('button', { name: '친구들에게 공유하기' }).click();
  await expect(page.locator('img.s-shareImg')).toHaveAttribute('src', /^data:image\/png/);
  await shot(page, `${tag}-06-share`, false);
  await page.getByRole('button', { name: '닫기' }).first().click();

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('오늘의 영어 퍼즐 완료!');
  await expect(page.locator('.s-mini i.ms')).toHaveCount(1);
  await expect(page.locator('.s-mini i.jk')).toHaveCount(1);
  await shot(page, `${tag}-07-home-done`);
});

test('비로그인으로 푼 기록이 가입하면 제출되고 랭킹·배치고사·연속 학습에 반영된다', async ({ page }, info) => {
  const tag = info.project.name;
  const id = uid('e2e');
  await page.goto('/play');
  await solveByKeyboard(page);
  await expect(page).toHaveURL(/\/result$/);
  await page.getByRole('dialog', { name: '다음 퍼즐 알림' }).locator('button.btn.line').click();

  await page.getByRole('button', { name: '로그인하고 매일 이어가기' }).click();
  await signup(page, id);
  await expect(page.locator('.s-tbar')).toContainText('배치고사 1/3일');
  await expect(page.locator('.s-tbar')).toContainText('예상 티어');
  await shot(page, `${tag}-08-result-logged`);

  await page.goto('/');
  await expect(page.locator('.s-stTop')).toContainText('1일 연속');
  await expect(page.locator('.s-rank.me')).toContainText(id);
  await expect(page.locator('.s-ava .s-tb').filter({ visible: true })).toHaveText('?');
  await shot(page, `${tag}-09-home-logged`);

  await page.goto('/ranking');
  await expect(page.locator('.s-myRank')).toContainText(id);
  await expect(page.locator('.s-rankList .s-rank')).not.toHaveCount(0);
  await shot(page, `${tag}-10-ranking`);
});

test('풀던 판은 저장돼서 새로고침 후 이어서 푼다', async ({ page }) => {
  await page.goto('/play');
  await solveByKeyboard(page, { stopAfter: 5 });
  const score = await page.locator('.stats .stat').nth(2).locator('b').textContent();
  expect(Number(score!.replace(/,/g, ''))).toBeGreaterThan(0);
  await page.getByRole('button', { name: '일시정지' }).click();
  await page.getByRole('button', { name: '그만두기' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/풀던 중이에요 · \d+\/\d+ 단어/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: '이어서 풀기' })).toBeVisible();
  await page.getByRole('link', { name: '이어서 풀기' }).click();
  await expect(page.locator('.stats .stat').nth(2).locator('b')).toHaveText(score!);
  await expect(page.locator('.cell.locked')).toHaveCount(5);
});

test('프로필: 캐릭터, 이메일, 알림, 로그아웃', async ({ page }, info) => {
  const tag = info.project.name;
  const id = uid('prof');
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).first().click();
  await expect(page.getByRole('dialog', { name: '로그인' })).toBeVisible();
  await shot(page, `${tag}-11-login`, false);
  await signup(page, id);
  await page.getByRole('link', { name: '프로필' }).first().click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('.s-idBig')).toContainText(id);
  await expect(page.locator('.s-tierSub')).toHaveText('배치고사 중 · 예상 티어');

  await page.getByRole('button', { name: '프로필 캐릭터 바꾸기' }).click();
  await page.getByRole('button', { name: /곰칸/ }).click();
  await page.getByRole('button', { name: '프로필 캐릭터 바꾸기' }).click();
  await expect(page.getByRole('button', { name: /곰칸/ })).toHaveClass(/on/);
  await page.getByRole('button', { name: '닫기' }).first().click();

  // 메일 없이 알림을 켜면 메일 등록부터
  await page.getByRole('switch').click();
  await page.locator('#email').fill(`${id}@example.com`);
  await page.locator('.s-sheet').getByRole('button', { name: '등록하기' }).click();
  await expect(page.locator('.s-val.gray')).toContainText(`${id}@example.com`);
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await shot(page, `${tag}-12-profile`);

  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '로그인' }).first()).toBeVisible();
});

test('기존 계정 로그인: 연속 학습·티어가 보인다', async ({ page }, info) => {
  const tag = info.project.name;
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).first().click();
  await page.getByLabel('아이디').fill('demo_user');
  await page.getByLabel('비밀번호').fill('wrong-password');
  await page.locator('.s-sheet').getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.locator('.s-err')).toHaveText('아이디 또는 비밀번호가 맞지 않아요.');
  await login(page, 'demo_user', 'puzzle1234');
  await expect(page.locator('.s-stTop')).toContainText('6일 연속');
  await expect(page.locator('.s-ava .s-tb').filter({ visible: true })).not.toHaveText('?');
  await shot(page, `${tag}-13-home-demo`);
  await page.goto('/profile');
  await expect(page.locator('.s-track')).toBeVisible();
  await shot(page, `${tag}-14-profile-demo`);
});

test('도움말 시트', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: '도움말' }).first().click();
  const sheet = page.getByRole('dialog', { name: '도움말' });
  await expect(sheet.locator('.rule')).toHaveCount(8);
  await shot(page, `${info.project.name}-15-help`, false);
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
});
