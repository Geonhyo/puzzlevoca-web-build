/** 도움말 규칙 (사이트 도움말 시트와 게임 안 도움말이 함께 쓴다) */
const RULES = [
  '칸을 누르면 그 단어의 뜻과 예문이 나와요.',
  '알파벳을 누르면 고른 칸에 들어가요.',
  '겹치는 칸은 한 번 더 누르면 방향이 바뀌어요.',
  '틀리면 15점이 깎이고 콤보가 끊겨요.',
  '연달아 맞히면 콤보가 쌓여 점수가 올라가요.',
  '×2, ×3 칸은 점수가 그만큼 곱해져요.',
  '막히면 조커로 한 칸을 열어요. 2장까지 무료예요.',
  '빨리 끝낼수록 시간 보너스가 커져요.',
];

export function HelpRules({ bare }: { bare?: boolean }) {
  return (
    <div className={`panel${bare ? ' s-helpPanel' : ''}`}>
      {RULES.map((r, i) => <div className="rule" key={i}><span className="no">{i + 1}</span><span>{r}</span></div>)}
    </div>
  );
}
