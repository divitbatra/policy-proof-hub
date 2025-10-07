import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const { groupName = 'Admin', numberOfUsers = 15 } = await req.json();

    console.log(`Adding ${numberOfUsers} users to group: ${groupName}`);

    // Get or create the group
    let { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .ilike('name', groupName)
      .single();

    if (groupError || !group) {
      console.log(`Group ${groupName} not found, creating it...`);
      const { data: newGroup, error: createError } = await supabase
        .from('groups')
        .insert({ name: groupName, description: `${groupName} group for sample users` })
        .select('id')
        .single();
      
      if (createError) throw createError;
      group = newGroup;
    }

    const groupId = group.id;
    console.log(`Using group ID: ${groupId}`);

    // Get current user count to determine starting index
    const { count: existingCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const startIndex = (existingCount || 0) + 1;
    const createdUsers = [];

    for (let i = 0; i < numberOfUsers; i++) {
      const userIndex = startIndex + i;
      const email = `user${userIndex}@example.com`;
      const password = 'Password123!';
      const fullName = `Test User ${userIndex}`;

      console.log(`Creating user ${i + 1}/${numberOfUsers}: ${email}`);

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError) {
        console.error(`Error creating auth user ${email}:`, authError);
        continue;
      }

      // Profile is created automatically by trigger, but we'll verify
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add user to group
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: authUser.user.id
        });

      if (memberError) {
        console.error(`Error adding user to group:`, memberError);
      } else {
        createdUsers.push({ email, fullName });
      }
    }

    console.log(`Successfully created ${createdUsers.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdUsers.length} users in ${groupName} group`,
        users: createdUsers,
        groupId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
