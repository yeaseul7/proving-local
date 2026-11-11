'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  language: 'ko' | 'en';
  // 로그인한 경우 프로필 버튼, 아니면 로그인 버튼 옆의 도움말 버튼으로 연다.
  account?: { name: string; avatar?: string | null; title?: string };
  login?: ReactNode;
  disabled?: boolean;
  onSettings?: () => void;
};

const helpLinks = [
  { href: '/privacy', ko: '개인정보처리방침', en: 'Privacy policy' },
  { href: '/terms', ko: '이용약관', en: 'Terms of service' },
];

function MenuIcon({ name }: { name: 'settings' | 'help' | 'chevron' | 'doc' }) {
  const paths = {
    settings: <><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></>,
  };
  return <svg width={name === 'chevron' ? 14 : 17} height={name === 'chevron' ? 14 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

// ChatGPT처럼 사이드바 아래 프로필을 누르면 위로 열리는 메뉴. 도움말은 옆(모바일은 아래)으로 펼친다.
export function AccountMenu({ language, account, login, disabled, onSettings }: Props) {
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => { if (!(event.target instanceof Node && ref.current?.contains(event.target))) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  const toggle = () => { setOpen(value => !value); setHelp(false); };
  const helpItems = <div className="account-submenu" role="menu" aria-label={en ? 'Help' : '도움말'}>
    {helpLinks.map(link => <a key={link.href} role="menuitem" href={link.href} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
      <MenuIcon name="doc"/>{en ? link.en : link.ko}
    </a>)}
  </div>;

  return <div className="account-menu" ref={ref}>
    {account
      ? <button ref={trigger} type="button" className="connected-account account-menu-trigger" title={account.title} aria-label={en ? `Account menu · ${account.name}` : `계정 메뉴 · ${account.name}`} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          {account.avatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="sidebar-account-avatar" src={account.avatar} alt="" width={32} height={32}/>
            : <span className="sidebar-account-avatar sidebar-account-placeholder" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg></span>}
          <span className="sidebar-account-name">{account.name}</span>
        </button>
      : <>{login}<button ref={trigger} type="button" className="account-help-button" aria-label={en ? 'Help' : '도움말'} title={en ? 'Help' : '도움말'} aria-haspopup="menu" aria-expanded={open} onClick={toggle}><MenuIcon name="help"/></button></>}
    {open && !account && <div className="account-menu-panel" role="menu" aria-label={en ? 'Help' : '도움말'}>
      {helpLinks.map(link => <a key={link.href} role="menuitem" href={link.href} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
        <MenuIcon name="doc"/>{en ? link.en : link.ko}
      </a>)}
    </div>}
    {open && account && <div className="account-menu-panel" role="menu" aria-label={en ? 'Account' : '계정'}>
      <button type="button" role="menuitem" disabled={disabled} onClick={() => { setOpen(false); onSettings?.(); }}>
        <MenuIcon name="settings"/>{en ? 'Settings' : '설정'}
      </button>
      <div className="account-menu-help" onMouseEnter={() => setHelp(true)} onMouseLeave={() => setHelp(false)}>
        <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={help} onClick={() => setHelp(true)}>
          <MenuIcon name="help"/>{en ? 'Help' : '도움말'}<span className="account-menu-chevron"><MenuIcon name="chevron"/></span>
        </button>
        {help && helpItems}
      </div>
    </div>}
  </div>;
}
