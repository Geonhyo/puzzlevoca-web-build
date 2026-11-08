'use client';
/**
 * 프로필 캐릭터 "칸 친구들" (목업 v3): 손그림 선(살짝 떨리는 외곽선) + 리소 인쇄처럼 어긋난 채색.
 * 일러스트 고유 색은 그림 데이터라 토큰이 아닌 여기에 둔다.
 */
import { useId } from 'react';

const INK = '#4a3631';
const RR = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
const BODY = RR(14, 22, 36, 30, 10.5);
const TORSO = 'M17 66V54c0-4 3-7 7-7h16c4 0 7 3 7 7v12';
const HANDS = 'M20.5 57a3.8 3 0 1 0 7.6 0a3.8 3 0 1 0-7.6 0ZM35.9 57a3.8 3 0 1 0 7.6 0a3.8 3 0 1 0-7.6 0Z';

type Part = [string, string | null, boolean?];
interface Char { name: string; desc: string; bg: string; tilt: number; parts: Part[]; marks: string; noBlush?: boolean; by?: number }

export const CHARS: Char[] = [
  { name: '냥칸', desc: '낮잠 장인', bg: '#f6e9df', tilt: -4,
    parts: [[TORSO, '#fbf1e4'], [HANDS, '#fbf1e4'], ['M44 44c7 0 9-6 7-9c-1-2-3-1-3 1', null], ['M17 27L18.5 12L28 22.5', '#fbf1e4'], ['M47 27L46.5 13.5L37 22', '#fbf1e4'], [BODY, '#fbf1e4'], ['M41 12.5l5 2.5', null]],
    marks: `<path d="M21.5 35.5q2.5 2 5 0M37.5 35.5q2.5 2 5 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M31 39.5q1 1.2 2 0" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><path d="M27 25.5l1.5 3.5M31 24.5v3.8M35 25.5l-1.5 3.5" stroke="#e39b5b" stroke-width="1.6" stroke-linecap="round"/><path d="M10 38.5l6 .8M48 39.3l6-.8" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/><text x="45" y="18" font-family="Georgia,serif" font-style="italic" font-size="6.5" fill="${INK}">z</text>` },
  { name: '토칸', desc: '수다쟁이', bg: '#fbe3e3', tilt: 3,
    parts: [[TORSO, '#fffaf5'], [HANDS, '#fffaf5'], ['M21 23c-3-8-2-16 1.5-16.5S27 15 26.5 23', '#fcd9dd'], ['M38 23c1-6 6-10 11-9c3 1 2 5-2 6c-3 1-6 2-6 3', '#fcd9dd'], [BODY, '#fffaf5']],
    marks: `<ellipse cx="25" cy="35" rx="2.2" ry="2.7" fill="${INK}"/><circle cx="25.8" cy="34.1" r=".8" fill="#fff"/><ellipse cx="39" cy="35" rx="2.2" ry="2.7" fill="${INK}"/><circle cx="39.8" cy="34.1" r=".8" fill="#fff"/><path d="M29 40.5q3 2.6 6 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M30.6 41.6h2.8v2.4h-2.8z" fill="#fff" stroke="${INK}" stroke-width="1.1"/><path d="M48 31l3-2M49 35h3.5M48 39l3 1.5" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>` },
  { name: '곰칸', desc: '든든한 맏형', bg: '#e2ecf3', tilt: -1.5,
    parts: [[TORSO, '#e3c2a2'], ['M26 66v-9c0-3 3-5 6-5s6 2 6 5v9', '#fbeedd'], [HANDS, '#d6b08c'], ['M13 25.5a5.5 5.5 0 1 1 8-4.5', '#e3c2a2'], ['M43 21a5.5 5.5 0 1 1 8 4.5', '#e3c2a2'], [BODY, '#e3c2a2'], ['M26 41.5c0-3.5 2.6-5 6-5s6 1.5 6 5-2.6 5-6 5-6-1.5-6-5z', '#fbeedd']],
    marks: `<circle cx="22.5" cy="34" r="1.6" fill="${INK}"/><circle cx="41.5" cy="34" r="1.6" fill="${INK}"/><path d="M20.5 30.5l4-.6M39.5 29.9l4 .6" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M30 39.5c0-1 1-1.6 2-1.6s2 .6 2 1.6-1 1.6-2 1.6-2-.6-2-1.6z" fill="${INK}"/><path d="M32 41.2v1.8M30 43.6q2 .8 4 0" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` },
  { name: '멍칸', desc: '응원단장', bg: '#f7ecd2', tilt: 4,
    parts: [[TORSO, '#fffaf5'], [HANDS, '#fffaf5'], [BODY, '#fffaf2'], ['M15.5 26c-5 0-7 9-4 13.5 2 2.6 5 1 5.5-2', '#d9b38e'], ['M48 25c5 1.5 6 9 3 12.5-2 2-4.5 1-5-1.5', '#d9b38e'], ['M35.5 30.5c1-3 7-3.5 8 0s-1 6.5-4 6.5-5-3.5-4-6.5z', '#f3e2cb']],
    marks: `<circle cx="25" cy="34.5" r="1.9" fill="${INK}"/><circle cx="39.5" cy="34" r="1.9" fill="${INK}"/><path d="M30.3 38.6c0-.9.8-1.4 1.8-1.4s1.8.5 1.8 1.4-.8 1.3-1.8 1.3-1.8-.4-1.8-1.3z" fill="${INK}"/><path d="M28.6 41q1.7 1.8 3.4 0q1.7 1.8 3.4 0" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><path d="M31.4 42c0 2.6 2.2 2.6 2.2 0" fill="#f0889a" stroke="${INK}" stroke-width="1.1"/><path d="M53 45l3 1.5M53.5 49l3.2-.2M52 52.5l2.5 1.6" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` },
  { name: '삐칸', desc: '부지런쟁이', bg: '#e1efe0', tilt: -3,
    parts: [[TORSO, '#fff0a8'], [HANDS, '#fff0a8'], [BODY, '#fff0a8'], ['M18.5 23.5l3-5 3 3 3-4.5 3 4 3-4 3 4.5 3-3 3 5', '#fffdf6'], ['M29.5 39l3-2.4 3 2.4-3 2.2z', '#ffc685']],
    marks: `<path d="M24.5 31.5v4.5M39.5 31.5v4.5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M14 40c-3 .5-3.5 3.5-1.5 5M50 40c3 .5 3.5 3.5 1.5 5" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><path d="M44 13l1.5-3M48 15l3-1.5M40 12.5l-.5-3" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>` },
  { name: '펭칸', desc: '단어 수집가', bg: '#e6e4f2', tilt: 1.5,
    parts: [[TORSO, '#b9c6ea'], ['M25 66v-10c0-3 3-5 7-5s7 2 7 5v10', '#fffaf2'], [HANDS, '#b9c6ea'], [BODY, '#b9c6ea'], ['M32 26.5c-5-2.5-13 0-13 8.5 0 7.5 6 13 13 13s13-5.5 13-13c0-8.5-8-11-13-8.5z', '#fffaf2'],
      ['M19 33.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM37 33.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM27 33.5h10', null], ['M29.8 38.5h4.4l-2.2 2.6z', '#ffd07a'], ['M15 45c4 3 30 3 34 0l-1 4c-5 2-27 2-32 0z', '#f6a2a2']],
    marks: `<circle cx="23" cy="34" r="1.3" fill="${INK}"/><circle cx="41" cy="34" r="1.3" fill="${INK}"/>` },
];

function draw(c: Char, uid: string) {
  const line = (d: string) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" filter="url(#r${uid})"/>`;
  const els = c.parts.map(p => (p[1] ? `<path d="${p[0]}" fill="${p[1]}"/>` : '') + (p[2] !== false ? line(p[0]) : '')).join('');
  const cheek = c.noBlush ? '' : `<g filter="url(#b${uid})" fill="#ff9fae" opacity=".7"><ellipse cx="19.5" cy="${c.by || 40}" rx="3.2" ry="2.2"/><ellipse cx="44.5" cy="${c.by || 40}" rx="3.2" ry="2.2"/></g>`;
  return `<circle cx="32" cy="32" r="32" fill="${c.bg}"/><defs><filter id="r${uid}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="1" seed="${(c.name.length * 7 + uid.length) % 50}"/><feDisplacementMap in="SourceGraphic" scale=".75"/></filter><filter id="b${uid}"><feGaussianBlur stdDeviation=".9"/></filter><clipPath id="c${uid}"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#c${uid})"><g transform="rotate(${c.tilt} 32 38)">${els}${cheek}<g filter="url(#r${uid})">${c.marks}</g></g></g>`;
}

export function Avatar({ index, size }: { index: number; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = CHARS[index] ?? CHARS[0];
  return <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" dangerouslySetInnerHTML={{ __html: draw(c, uid) }} />;
}
