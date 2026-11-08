'use client';
/** 프로필 캐릭터 "칸 친구들" (프로토타입의 전신 렌더러를 원 안에 담은 아바타). 번호 순서: 삐칸·냥칸·토칸·곰칸·멍칸·펭칸 */
import { useId } from 'react';
import { avatarInner, KAN, KAN_ORDER } from './kan';

export const CHARS = KAN_ORDER.map(k => ({ name: KAN[k].name, desc: KAN[k].desc }));

export function Avatar({ index, size }: { index: number; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <svg viewBox="9 5 82 82" width={size} height={size} aria-hidden="true" dangerouslySetInnerHTML={{ __html: avatarInner(index, uid) }} />;
}
