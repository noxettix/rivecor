import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kzyiapobbuyiukttkavc.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eWlhcG9iYnV5aXVrdHRrYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzEyMTUsImV4cCI6MjA5MjA0NzIxNX0.1rrFU076xcuSwPClHalN9nzyf893kGs7H3A6EKO0Pp4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);