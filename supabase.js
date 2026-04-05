// Supabase Configuration
const SUPABASE_URL = 'https://smhpyukftcntahshzwsx.supabase.co';
const SUPABASE_ANON_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtaHB5dWtmdGNudGFoc2h6d3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjEyNzIsImV4cCI6MjA5MDkzNzI3Mn0.Gq_Hq-tzQwYeWDEG55_X2LhxfcB1wN1SZMEWYkJ-WKM';

// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test Connection
async function testConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('subjects')
            .select('count');
        
        if (error) {
            console.log('Supabase connecting...');
        } else {
            console.log('Supabase connected ✅');
        }
    } catch (err) {
        console.log('Running on local storage mode');
    }
}

testConnection();
