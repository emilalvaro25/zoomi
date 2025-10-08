/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

export const useAuth = create<{
  session: Session | null;
  setSession: (session: Session | null) => void;
}>(set => ({
  session: null,
  setSession: session => set({ session }),
}));
