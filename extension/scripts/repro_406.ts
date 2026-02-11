
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

console.log('Connecting to Supabase:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
});

async function run() {
    // 1. Sign Up User
    const email = `repro_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Signing up user: ${email}`);
    const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
        email,
        password
    });

    if (signUpError) {
        console.error('Sign up failed:', signUpError);
        return;
    }

    if (!user) {
        console.error('No user returned');
        return;
    }

    console.log('User signed up:', user.id);

    // 2. Insert Note
    const hostname = 'example.com';
    const fullPath = 'example.com/foo?q=1';

    console.log('Inserting note...');
    const { error: insertError } = await supabase.from('sitecue_notes').insert({
        user_id: user.id,
        url_pattern: hostname,
        content: 'Test Note',
        scope: 'domain'
    });

    if (insertError) {
        console.error('Insert failed:', insertError);
        // Continue anyway to see if select works (maybe RLS prevented insert but we want to test select)
    } else {
        console.log('Note inserted successfully.');
    }

    // 3. Run the problematic query
    console.log('Running query from background.ts...');

    // Test 1: Normal match
    const orQuery = `and(scope.eq.domain,url_pattern.eq.${hostname}),and(scope.eq.exact,url_pattern.eq.${fullPath})`;

    const { count, error, status, statusText } = await supabase
        .from('sitecue_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .or(orQuery);

    console.log('Query Result (Match):', { count, status, statusText });

    if (error) {
        console.error('Query Error (Match):', error);
    }

    // Test 2: Comma in URL
    const complexHostname = 'example.com';
    const complexPath = 'example.com/foo,bar'; // Comma might break .or() parser if not handled
    // Notes logic usually normalizes URL first, but let's see if query breaks.

    const orQueryComplex = `and(scope.eq.domain,url_pattern.eq.${complexHostname}),and(scope.eq.exact,url_pattern.eq.${complexPath})`;
    console.log('Running query with complex path:', orQueryComplex);

    const { count: count2, error: error2, status: status2, statusText: statusText2 } = await supabase
        .from('sitecue_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .or(orQueryComplex);

    console.log('Query Result (Complex):', { count: count2, status: status2, statusText: statusText2 });
    if (error2) {
        console.error('Query Error (Complex):', error2);
    }

    // Test 4: Comma in URL with Quoting
    // PostgREST requires values with reserved characters to be double-quoted.
    // However, since we are inside a string, we need to escape the quotes.
    const orQueryComplexFixed = `and(scope.eq.domain,url_pattern.eq."${complexHostname}"),and(scope.eq.exact,url_pattern.eq."${complexPath}")`;
    console.log('Running fixed query with complex path:', orQueryComplexFixed);

    const { count: count4, error: error4, status: status4, statusText: statusText4 } = await supabase
        .from('sitecue_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .or(orQueryComplexFixed);

    console.log('Query Result (Fixed):', { count: count4, status: status4, statusText: statusText4 });
    if (error4) {
        console.error('Query Error (Fixed):', error4);
    }

    // Test 3: No match
    const noMatchHost = 'nomatch.com';
    const noMatchPath = 'nomatch.com/foo';
    const orQueryNoMatch = `and(scope.eq.domain,url_pattern.eq.${noMatchHost}),and(scope.eq.exact,url_pattern.eq.${noMatchPath})`;

    const { count: count3, error: error3, status: status3, statusText: statusText3 } = await supabase
        .from('sitecue_notes')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .or(orQueryNoMatch);

    console.log('Query Result (No Match):', { count: count3, status: status3, statusText: statusText3 });
    if (error3) {
        console.error('Query Error (No Match):', error3);
    }
}

run().catch(console.error);
