// 탐색에 공개 기록이 없을 때의 일러스트. 빈 노트(empty-notebook)와 같은 선·색을 쓴다.
export function EmptyExplore(){
  return <svg className="empty-explore" width="168" height="124" viewBox="0 0 168 124" fill="none" aria-hidden="true">
    <ellipse cx="84" cy="112" rx="56" ry="6" fill="var(--color-accent-soft)"/>
    <rect x="30" y="30" width="62" height="74" rx="6" fill="var(--color-accent-soft)" transform="rotate(-8 61 67)"/>
    <rect x="44" y="20" width="62" height="78" rx="6" fill="var(--color-paper)" stroke="var(--color-accent-border)" strokeWidth="1.4"/>
    <path d="M55 36h30M55 48h40M55 60h34M55 72h22" stroke="var(--color-accent-border)" strokeOpacity=".6" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="112" cy="72" r="17" fill="var(--color-paper)" fillOpacity=".7" stroke="var(--color-accent)" strokeWidth="2.2"/>
    <path d="m124.5 84.5 12 12" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round"/>
    <path d="M104 68a9 9 0 0 1 8-6" stroke="var(--color-accent-border)" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M128 22v8m-4-4h8M22 50v6m-3-3h6M140 50l3-3" stroke="var(--color-accent-border)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
