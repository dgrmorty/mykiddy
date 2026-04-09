import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { sanitizeLogoUrl, sanitizeSchoolName } from '../utils/branding';

const DEFAULT_SCHOOL = 'Дети В ТОПЕ';

interface BrandingValue {
  logoUrl: string | null;
  schoolName: string;
  /** true пока первый запрос к settings не завершён */
  brandingLoading: boolean;
}

const BrandingContext = createContext<BrandingValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL);
  const [brandingLoading, setBrandingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from('settings').select('id, value').in('id', ['logo_url', 'school_name']);
        if (cancelled) return;
        if (error || !data) {
          setBrandingLoading(false);
          return;
        }
        for (const row of data) {
          if (row.id === 'logo_url' && row.value != null) {
            const s = sanitizeLogoUrl(String(row.value));
            if (s) setLogoUrl(s);
          }
          if (row.id === 'school_name' && row.value != null) {
            setSchoolName(sanitizeSchoolName(String(row.value), DEFAULT_SCHOOL));
          }
        }
      } catch {
        /* сеть / RLS — остаются дефолты */
      } finally {
        if (!cancelled) setBrandingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ logoUrl, schoolName, brandingLoading }),
    [logoUrl, schoolName, brandingLoading],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingValue {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
