'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export function useUserRole(){
  const supabase = createClient();
  const [role, setRole] = useState<'admin'|'cajero'|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const { data, error } = await supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', COMPANY_ID)
      .limit(1)
      .single();
    if(!error && data){ setRole(data.role as any); }
    setLoading(false);
  })(); }, []);

  return { role, loading };
}
