import { createServerSupabase } from '@/lib/supabaseServer';
import type { Session } from '@supabase/supabase-js';

export async function getSessionAndRole(): Promise<{
  session: Session | null;
  role: 'admin' | 'cajero' | null;
}> {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  let role: 'admin' | 'cajero' | null = null;
  if (session?.user) {
    const { data } = await supabase
      .from('v_current_user_role')
      .select('role')
      .maybeSingle();
    if (data?.role === 'admin' || data?.role === 'cajero') role = data.role;
  }

  return { session, role };
}
