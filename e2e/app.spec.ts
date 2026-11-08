import { expect, test } from '@playwright/test';
import { lastMailTo, login, selectedKey, shot, signup, solveByKeyboard, todayPuzzle, uid } from './helpers';

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
    // 랭킹 행이 서버에서 그려져 HTML 에 있음 (홈은 1분 캐시라 지금 1위와는 다를 수 있어 상위 100명 중 누군가인지만 본다)
    const names: string[] = (await (await request.get('http://localhost:8000/api/rankings/today?limit=100')).json()).top.map((r: { loginId: string }) => r.loginId);
    expect(html).toMatch(/class="s-rank m1/);
    expect(names.some(n => html.includes(`<span>${n}</span>`))).toBe(true);
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
  // 미스/조커 칸이 가로세로 교차 칸이면 두 단어에 함께 표시된다
  const crossCount = (k: string) => (board.cells[k].words.A != null ? 1 : 0) + (board.cells[k].words.D != null ? 1 : 0);
  await expect(page.locator('.word .tg', { hasText: '미스' })).toHaveCount(crossCount(key));
  await expect(page.locator('.word .tg.j')).toHaveCount(crossCount(jkKey));
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
  // 로그인 상태의 결과 카드 파일명: puzzlevoca_{아이디}_{YYMMDD}.png
  await page.getByRole('button', { name: '친구들에게 공유하기' }).click();
  const shareSheet = page.getByRole('dialog', { name: '결과 카드 공유' });
  await expect(shareSheet.locator('img.s-shareImg')).toHaveAttribute('src', /^data:image\/png/);
  const dl = page.waitForEvent('download');
  await shareSheet.getByRole('button', { name: /^이미지(로)? 저장$/ }).click();
  expect((await dl).suggestedFilename()).toMatch(new RegExp(`^puzzlevoca_${id}_\\d{6}\\.png$`));
  await page.keyboard.press('Escape');

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

  // 가입 때 넣은 메일 → 바꾸기, 알림 켜기
  await expect(page.locator('.s-val.gray')).toContainText(`${id}@example.com`);
  await page.getByRole('button', { name: /^이메일/ }).click();
  await page.locator('#email').fill(`new_${id}@example.com`);
  await page.locator('.s-sheet').getByRole('button', { name: '저장하기' }).click();
  await expect(page.locator('.s-val.gray')).toContainText(`new_${id}@example.com`);
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
  await login(page, 'demo_user', 'wrong-password', { expectClosed: false });
  await expect(page.locator('.s-err')).toHaveText('비밀번호가 맞지 않아요.');
  await login(page, 'demo.user@example.com', 'puzzle1234'); // 이메일로도 로그인
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

test('새 계정 만들기: 이메일로 아이디 추천, 아이디 중복 확인', async ({ page }, info) => {
  const tag = info.project.name;
  const n = Math.random().toString(36).slice(2, 6);
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).first().click();
  await page.getByRole('button', { name: '새 계정 만들기' }).click();
  await page.locator('#semail').fill(`sora.kim${n}@gmail.com`);
  const chip = page.locator('.s-chip');
  await expect(chip).toHaveText(`sorakim${n}`);
  await shot(page, `${tag}-18-signup-suggest`, false);
  await chip.click();
  await expect(page.locator('#sid')).toHaveValue(`sorakim${n}`);
  await expect(page.getByText('쓸 수 있는 아이디예요.')).toBeVisible();
  await page.locator('#sid').fill('demo_user');
  await expect(page.getByText('이미 쓰고 있는 아이디예요.')).toBeVisible();
  await page.locator('#spw').fill('password123');
  await page.getByRole('button', { name: '비밀번호 보기' }).click();
  await expect(page.locator('#spw')).toHaveAttribute('type', 'text');
  await shot(page, `${tag}-19-signup-taken`, false);
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.locator('.s-err')).toHaveText('이미 쓰고 있는 아이디예요.');
  await page.locator('#sid').fill(`sorakim${n}`);
  await expect(page.getByText('쓸 수 있는 아이디예요.')).toBeVisible();
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.locator('.s-sheet')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '프로필' }).filter({ visible: true })).toBeVisible();
});

test('비밀번호 찾기: 이메일 → 임시 비밀번호 로그인 → 새 비밀번호', async ({ page }, info) => {
  const tag = info.project.name;
  const id = uid('pw');
  const email = `${id}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).first().click();
  await shot(page, `${tag}-11-login`, false);
  await signup(page, id, 'original-pass', email);
  await page.goto('/profile');
  await page.getByRole('button', { name: '로그아웃' }).click();

  await page.getByRole('button', { name: '로그인' }).first().click();
  await page.getByRole('button', { name: '비밀번호를 잊었어요' }).click();
  await page.locator('#remail').fill('nobody_zz9@example.com');
  await page.getByRole('button', { name: '임시 비밀번호 받기' }).click();
  await expect(page.locator('.s-err')).toHaveText('가입된 이메일이 아니에요. 다시 확인해주세요.');
  await shot(page, `${tag}-16-reset-error`, false);
  await page.locator('#remail').fill(email);
  await page.getByRole('button', { name: '임시 비밀번호 받기' }).click();
  const sent = page.getByRole('dialog', { name: '임시 비밀번호를 보냈어요' });
  await expect(sent).toContainText(`${email}로 보냈어요`);
  await shot(page, `${tag}-17-reset-sent`, false);

  const mail = lastMailTo(email)!;
  expect(mail.subject).toBe('[퍼즐보카] 임시 비밀번호를 보내드려요');
  const temp = mail.text.match(/임시 비밀번호예요: (\S+)/)![1];
  await sent.getByRole('button', { name: '로그인하기' }).click();
  await expect(page.locator('#lid')).toHaveValue(email);
  await login(page, email, temp, { expectClosed: false });
  const np = page.getByRole('dialog', { name: '새 비밀번호를 정해주세요' });
  await expect(np).toBeVisible();
  await shot(page, `${tag}-20-new-password`, false);
  await page.locator('#npw').fill('brand-new-pass');
  await page.locator('#npw2').fill('different-pass');
  await np.getByRole('button', { name: '바꾸기' }).click();
  await expect(page.locator('.s-err')).toHaveText('두 비밀번호가 달라요.');
  await page.locator('#npw2').fill('brand-new-pass');
  await np.getByRole('button', { name: '바꾸기' }).click();
  await expect(page.locator('.s-sheet')).toHaveCount(0);

  await page.goto('/profile');
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByRole('button', { name: '로그인' }).first().click();
  await login(page, id, 'brand-new-pass');
  await expect(page.getByRole('link', { name: '프로필' }).filter({ visible: true })).toBeVisible();
});

for (const mode of ['share', 'noshare'] as const) {
  test(`결과 카드: ${mode === 'share' ? '공유 지원 기기 → 카드 공유하기 + 이미지로 저장' : '공유 미지원 기기 → 이미지 저장만'}`, async ({ page }, info) => {
    await page.addInitScript(m => {
      const w = window as unknown as { __shared?: { name: string; type: string; text?: string }[] };
      if (m === 'share') {
        w.__shared = [];
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (d: { files?: File[] }) => !!d?.files?.length });
        Object.defineProperty(Navigator.prototype, 'share', {
          configurable: true,
          value: async (d: { files: File[]; text?: string }) => { w.__shared!.push(...d.files.map(f => ({ name: f.name, type: f.type, text: d.text }))); },
        });
      } else {
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: undefined });
        Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
      }
    }, mode);
    await page.goto('/play');
    await solveByKeyboard(page);
    await expect(page).toHaveURL(/\/result$/);
    await page.getByRole('dialog', { name: '다음 퍼즐 알림' }).locator('button.btn.line').click();
    await page.getByRole('button', { name: '친구들에게 공유하기' }).click();
    const sheet = page.getByRole('dialog', { name: '결과 카드 공유' });
    await expect(sheet.locator('img.s-shareImg')).toHaveAttribute('src', /^data:image\/png/);
    await page.waitForTimeout(400); // 시트 애니메이션
    await page.screenshot({ path: `test-results/screens/${info.project.name}-21-share-${mode}.png` });

    if (mode === 'share') {
      await expect(sheet.getByRole('button', { name: '이미지 저장' })).toHaveCount(0);
      await sheet.getByRole('button', { name: '카드 공유하기' }).click();
      const read = () => page.evaluate(() => (window as unknown as { __shared: { name: string; type: string; text?: string }[] }).__shared);
      await expect.poll(async () => (await read()).length).toBe(1);
      const shared = await read();
      expect(shared[0]).toMatchObject({ type: 'image/png', name: expect.stringMatching(/^puzzlevoca_\d{6}\.png$/) });
      const dl = page.waitForEvent('download');
      await sheet.getByRole('button', { name: '이미지로 저장' }).click();
      expect((await dl).suggestedFilename()).toMatch(/^puzzlevoca_\d{6}\.png$/);
    } else {
      await expect(sheet.getByRole('button', { name: '카드 공유하기' })).toHaveCount(0);
      await expect(sheet.getByRole('button', { name: '이미지로 저장' })).toHaveCount(0);
      const dl = page.waitForEvent('download');
      await sheet.getByRole('button', { name: '이미지 저장' }).click();
      expect((await dl).suggestedFilename()).toMatch(/^puzzlevoca_\d{6}\.png$/);
      await expect(sheet.getByRole('button', { name: '저장했어요' })).toBeVisible();
    }
  });
}
