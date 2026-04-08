const SUPABASE_URL = 'https://smhpyukftcntahshzwsx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtaHB5dWtmdGNudGFoc2h6d3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjEyNzIsImV4cCI6MjA5MDkzNzI3Mn0.Gq_Hq-tzQwYeWDEG55_X2LhxfcB1wN1SZMEWYkJ-WKM';
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
