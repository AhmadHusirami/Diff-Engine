'use client';
import { useEffect } from 'react';

export function ScrollLockFix() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Forcefully reset any overflow hidden that appears on html/body
      if (document.documentElement.style.overflow === 'hidden') {
        document.documentElement.style.overflow = '';
      }
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => observer.disconnect();
  }, []);

  return null;
}