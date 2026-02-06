import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const policyCategories = [
  'Compliance',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Technology',
  'Security',
  'Privacy'
]

const generatePolicyTitle = (index: number): string => {
  const categoryIndex = index % policyCategories.length
  const category = policyCategories[categoryIndex]
  const policyNumber = Math.floor(index / policyCategories.length) + 1
  return `${category} Policy ${policyNumber}`
}

const generatePolicyDescription = (title: string): string => {
  return `This is a sample description for the ${title}. It provides guidelines and regulations related to ${title.split(' ')[0].toLowerCase()} within the organization.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // --- Authentication & Authorization ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authenticatedUserId = claimsData.claims.sub

    // Check user role - only admin allowed
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', authenticatedUserId)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('Forbidden: user role is', profile?.role)
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Authenticated admin user ${authenticatedUserId}`)

    // --- Business Logic (uses service role for admin operations) ---
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting user population...')

    // Get existing groups
    const { data: existingGroups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .in('name', ['Directors', 'Executive Directors', 'Admin', 'SPO', 'PO'])
    
    if (groupsError) throw groupsError
    
    if (!existingGroups || existingGroups.length === 0) {
      throw new Error('Groups not found. Please create the groups first.')
    }

    console.log(`Found ${existingGroups.length} groups`)

    // Map groups to their user counts
    const groupConfig = [
      { name: 'Directors', userCount: 15 },
      { name: 'Executive Directors', userCount: 5 },
      { name: 'Admin', userCount: 20 },
      { name: 'SPO', userCount: 50 },
      { name: 'PO', userCount: 250 }
    ]

    const groupsWithCounts = existingGroups.map(group => {
      const config = groupConfig.find(g => g.name === group.name)
      return { ...group, userCount: config?.userCount || 0 }
    })

    // Get all existing users once to avoid repeated API calls
    console.log('Fetching existing users...')
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUsersMap = new Map(
      allUsers?.users.map(u => [u.email, u.id]) || []
    )
    console.log(`Found ${existingUsersMap.size} existing users`)

    // Create Users and assign to groups in smaller batches
    console.log('Creating/updating users...')
    let userIndex = 1
    const allUserIds: string[] = []
    const BATCH_SIZE = 10

    for (const group of groupsWithCounts) {
      const userIds: string[] = []
      
      for (let batchStart = 0; batchStart < group.userCount; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, group.userCount)
        const batchPromises = []

        for (let i = batchStart; i < batchEnd; i++) {
          const email = `user${userIndex + i - batchStart}@apex-demo.com`
          const password = crypto.randomUUID().slice(0, 16) + 'A1!'
          const fullName = `${group.name} User ${i + 1}`
          
          const existingUserId = existingUsersMap.get(email)
          
          if (existingUserId) {
            const updatePromise = supabaseAdmin
              .from('profiles')
              .upsert({
                id: existingUserId,
                email: email,
                full_name: fullName,
                department: group.name,
                role: group.name === 'Admin' ? 'admin' : 'employee'
              }, { onConflict: 'id' })
              .then(() => existingUserId)
            
            batchPromises.push(updatePromise)
          } else {
            const createPromise = supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: fullName
              }
            }).then(async ({ data: authData, error: authError }) => {
              if (authError) {
                console.error(`Error creating user ${email}:`, authError)
                return null
              }

              const uid = authData.user.id
              
              await supabaseAdmin
                .from('profiles')
                .upsert({
                  id: uid,
                  email: email,
                  full_name: fullName,
                  department: group.name,
                  role: group.name === 'Admin' ? 'admin' : 'employee'
                }, { onConflict: 'id' })

              return uid
            })
            
            batchPromises.push(createPromise)
          }
        }

        const batchResults = await Promise.all(batchPromises)
        const validUserIds = batchResults.filter(id => id !== null) as string[]
        userIds.push(...validUserIds)
        allUserIds.push(...validUserIds)
        
        userIndex += (batchEnd - batchStart)
        console.log(`Processed batch for ${group.name}, total users so far: ${allUserIds.length}`)
      }

      if (userIds.length > 0) {
        const groupMembers = userIds.map(uid => ({
          group_id: group.id,
          user_id: uid
        }))

        const { error: memberError } = await supabaseAdmin
          .from('group_members')
          .upsert(groupMembers, { onConflict: 'group_id,user_id', ignoreDuplicates: true })

        if (memberError) {
          console.error(`Error adding members to ${group.name}:`, memberError)
        } else {
          console.log(`Added ${userIds.length} members to ${group.name}`)
        }
      }
    }

    console.log(`Total users created: ${allUserIds.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Users populated successfully',
        stats: {
          users: allUserIds.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
