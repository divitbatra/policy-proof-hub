import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Authentication & Authorization ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Check user role - only admin allowed
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Forbidden: user role is', profile?.role);
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated admin user ${userId}`);

    // --- Business Logic (uses service role for admin operations) ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting cleanup process...');

    // Use the authenticated user as the protected user
    const adminUserId = userId;
    console.log(`Protecting current admin user: ${adminUserId}`);

    // Delete attestations for other users
    const { error: attestationsError } = await supabase
      .from('attestations')
      .delete()
      .neq('user_id', adminUserId);

    if (attestationsError) {
      console.error('Error deleting attestations:', attestationsError);
    } else {
      console.log('Deleted attestations for non-admin users');
    }

    // Delete assessment results for other users
    const { error: resultsError } = await supabase
      .from('assessment_results')
      .delete()
      .neq('user_id', adminUserId);

    if (resultsError) {
      console.error('Error deleting assessment results:', resultsError);
    } else {
      console.log('Deleted assessment results for non-admin users');
    }

    // Delete policy assignments for other users
    const { error: assignmentsError } = await supabase
      .from('policy_assignments')
      .delete()
      .neq('user_id', adminUserId)
      .not('user_id', 'is', null);

    if (assignmentsError) {
      console.error('Error deleting policy assignments:', assignmentsError);
    } else {
      console.log('Deleted policy assignments for non-admin users');
    }

    // Delete group members for other users
    const { error: membersError } = await supabase
      .from('group_members')
      .delete()
      .neq('user_id', adminUserId);

    if (membersError) {
      console.error('Error deleting group members:', membersError);
    } else {
      console.log('Deleted group members for non-admin users');
    }

    // Get all user IDs except admin
    const { data: usersToDelete, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', adminUserId);

    if (usersError) {
      throw usersError;
    }

    console.log(`Found ${usersToDelete?.length || 0} users to delete`);

    // Delete profiles for other users
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', adminUserId);

    if (profilesError) {
      console.error('Error deleting profiles:', profilesError);
    } else {
      console.log('Deleted profiles for non-admin users');
    }

    // Delete auth users
    let deletedAuthUsers = 0;
    if (usersToDelete && usersToDelete.length > 0) {
      for (const user of usersToDelete) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteAuthError) {
          console.error(`Error deleting auth user ${user.id}:`, deleteAuthError);
        } else {
          deletedAuthUsers++;
        }
      }
    }

    console.log(`Deleted ${deletedAuthUsers} auth users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        deletedUsers: deletedAuthUsers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in cleanup:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
