/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iydbsuzawosivjjqgwcn.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZGJzdXphd29zaXZqanFnd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzQ0NzcsImV4cCI6MjA3NTE1MDQ3N30.PNFW2DNJOOLi-sCCLX9vcBE7CTBrjuQJLyBF2z6yj3o';

export const supabase = createClient(supabaseUrl, supabaseKey);
