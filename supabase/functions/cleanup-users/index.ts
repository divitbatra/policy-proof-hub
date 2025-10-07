import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting cleanup process...');

    // Get the admin user ID
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'divitbatra1102@gmail.com')
      .single();

    if (adminError || !adminProfile) {
      throw new Error('Admin user not found');
    }

    const adminUserId = adminProfile.id;
    console.log(`Found admin user: ${adminUserId}`);

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
        keptUser: 'divitbatra1102@gmail.com'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in cleanup:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
