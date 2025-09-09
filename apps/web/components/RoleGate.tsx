'use client';
import { ReactNode } from 'react';
import { useUserRole } from './useUserRole';

export function RoleGate({ allow, children }: { allow: Array<'admin'|'cajero'>, children: ReactNode }){
  const { role, loading } = useUserRole();
  if(loading) return null;
  if(!role || !allow.includes(role)) return null;
  return <>{children}</>;
}
