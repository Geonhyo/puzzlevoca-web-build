import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { buildBoard, type PuzzleData } from '../src/shared/game-core';

export const API = 'http://localhost:8000';
export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export async function todayPuzzle(page: Page) {
  const res = await page.request.get(`${API}/api/puzzles/today`);
  expect(res.ok()).toBeTruthy();
  const p = (await res.json()) as PuzzleData;
  return { puzzle: p, board: buildBoard(p) };
}

/** 지금 선택된 칸의 "r,c" */
export async function selectedKey(page: Page) {
  if (!(await page.locator('.cell.sel').count())) return null;
  const label = await page.locator('.cell.sel').first().getAttribute('aria-label');
  const m = label?.match(/^(\d+)행 (\d+)열/);
  return m ? `${Number(m[1]) - 1},${Number(m[2]) - 1}` : null;
}

/** 선택된 칸의 정답을 키보드로 계속 친다 (게임이 자동으로 다음 칸으로 넘어감). */
export async function solveByKeyboard(page: Page, opts: { stopAfter?: number } = {}) {
  const { board } = await todayPuzzle(page);
  await page.locator('.cell.sel').waitFor();
  let n = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (opts.stopAfter != null && n >= opts.stopAfter) return n;
    const key = await selectedKey(page);
    if (!key) break;
    await page.keyboard.press(board.cells[key].ans);
    n++;
  }
  return n;
}

/** 로그인 시트가 열린 상태에서 → 새 계정 만들기 */
export async function signup(page: Page, loginId: string, password = 'password123', email = `${loginId}@example.com`) {
  await page.getByRole('button', { name: '새 계정 만들기' }).click();
  await page.locator('#semail').fill(email);
  await page.locator('#sid').fill(loginId);
  await expect(page.getByText('쓸 수 있는 아이디예요.')).toBeVisible();
  await page.locator('#spw').fill(password);
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.locator('.s-sheet')).toHaveCount(0);
}

/** 로컬 가짜 SMTP(mail-catcher)가 server/.mail 에 저장한 메일 중 받는 사람이 같은 최신 것 */
export function lastMailTo(to: string) {
  const dir = join(import.meta.dirname, '../../server/.mail');
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse();
  for (const f of files) {
    const m = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (m.to === to) return m as { to: string; subject: string; text: string };
  }
  return null;
}

export async function login(page: Page, identifier: string, password: string, opts: { expectClosed?: boolean } = {}) {
  await page.locator('#lid').fill(identifier);
  await page.locator('#lpw').fill(password);
  await page.locator('.s-sheet').getByRole('button', { name: '로그인', exact: true }).click();
  if (opts.expectClosed !== false) await expect(page.locator('.s-sheet')).toHaveCount(0);
}

export const shot = (page: Page, name: string, full = true) =>
  page.screenshot({ path: `test-results/screens/${name}.png`, fullPage: full });
