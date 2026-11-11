'use client';

export function RecordVisibility({ title, isPublic, disabled, english, showLabel = true, onChange }: {
  title: string;
  // 표처럼 열 제목이 이미 있는 곳에서는 글자 없이 토글만 보여준다.
  showLabel?: boolean;
  isPublic: boolean;
  disabled?: boolean;
  english: boolean;
  onChange: (isPublic: boolean) => void;
}) {
  return <button type="button" role="switch" aria-checked={isPublic}
    aria-label={english ? `Public visibility: ${title}` : `공개 설정: ${title}`}
    className="record-visibility" title={isPublic ? (english ? 'Public' : '공개') : (english ? 'Private' : '비공개')} disabled={disabled} onClick={() => onChange(!isPublic)}>
    <span className="record-visibility-track" aria-hidden="true"><span /></span>
    {showLabel && <span>{isPublic ? (english ? 'Public' : '공개') : (english ? 'Private' : '비공개')}</span>}
  </button>;
}
