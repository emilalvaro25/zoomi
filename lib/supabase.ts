/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      participants: {
        Row: {
          created_at: string;
          id: number;
          is_camera_off: boolean;
          is_hand_raised: boolean;
          is_muted: boolean;
          is_screen_sharing: boolean;
          language: string | null;
          meeting_id: string;
          name: string;
          role: string;
          status: string;
          uid: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_camera_off: boolean;
          is_hand_raised: boolean;
          is_muted: boolean;
          is_screen_sharing?: boolean;
          language?: string | null;
          meeting_id: string;
          name: string;
          role: string;
          status: string;
          uid: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_camera_off?: boolean;
          is_hand_raised?: boolean;
          is_muted?: boolean;
          is_screen_sharing?: boolean;
          language?: string | null;
          meeting_id?: string;
          name?: string;
          role?: string;
          status?: string;
          uid?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          created_at: string;
          id: string;
          is_final: boolean;
          meeting_id: string;
          participant_id: string;
          source_language: string | null;
          text: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_final: boolean;
          meeting_id: string;
          participant_id: string;
          source_language?: string | null;
          text: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_final?: boolean;
          meeting_id?: string;
          participant_id?: string;
          source_language?: string | null;
          text?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

const supabaseUrl = 'https://iydbsuzawosivjjqgwcn.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZGJzdXphd29zaXZqanFnd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzQ0NzcsImV4cCI6MjA3NTE1MDQ3N30.PNFW2DNJOOLi-sCCLX9vcBE7CTBrjuQJLyBF2z6yj3o';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
});