"use client";
import {useLayoutEffect,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

/** Only the student portal supports a personal dark theme. Reset on SPA navigation too. */
export function PortalThemeBoundary({children}:{children:ReactNode}) {
  const pathname=usePathname();
  useLayoutEffect(()=>{
    if(/^\/student(?:\/|$)/i.test(pathname||''))return;
    const root=document.documentElement;
    root.dataset.theme='light';
    root.classList.remove('dark');
    root.style.colorScheme='light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#FFFFFF');
  },[pathname]);
  return <>{children}</>;
}
