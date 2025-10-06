import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Policy categories and sample titles
const policyCategories = [
  'Code of Conduct',
  'Data Security',
  'Remote Work',
  'Expense Reimbursement',
  'Leave Policy',
  'Health & Safety',
  'IT Security',
  'Procurement',
  'Training & Development',
  'Performance Management',
  'Client Relations',
  'Conflict of Interest',
  'Confidentiality',
  'Workplace Harassment',
  'Emergency Procedures'
]

const generatePolicyTitle = (index: number, category: string) => {
  return `${category} Policy - Version ${Math.floor(index / policyCategories.length) + 1}`
}

const generatePolicyDescription = (category: string) => {
  return `This policy outlines the guidelines and procedures for ${category.toLowerCase()} within the organization. All employees must review and acknowledge this policy.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
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
    const BATCH_SIZE = 10 // Process 10 users at a time

    for (const group of groupsWithCounts) {
      const userIds: string[] = []
      
      // Process users in batches
      for (let batchStart = 0; batchStart < group.userCount; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, group.userCount)
        const batchPromises = []

        for (let i = batchStart; i < batchEnd; i++) {
          const email = `user${userIndex + i - batchStart}@apex-demo.com`
          const password = 'Demo123!'
          const fullName = `${group.name} User ${i + 1}`
          
          // Check if user exists in our map
          const existingUserId = existingUsersMap.get(email)
          
          if (existingUserId) {
            // User exists, just update profile and use their ID
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
            // Create new user
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

              const userId = authData.user.id
              
              // Insert profile
              await supabaseAdmin
                .from('profiles')
                .upsert({
                  id: userId,
                  email: email,
                  full_name: fullName,
                  department: group.name,
                  role: group.name === 'Admin' ? 'admin' : 'employee'
                }, { onConflict: 'id' })

              return userId
            })
            
            batchPromises.push(createPromise)
          }
        }

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises)
        const validUserIds = batchResults.filter(id => id !== null) as string[]
        userIds.push(...validUserIds)
        allUserIds.push(...validUserIds)
        
        userIndex += (batchEnd - batchStart) // Increment by actual batch size
        console.log(`Processed batch for ${group.name}, total users so far: ${allUserIds.length}`)
      }

      // Add users to group in one operation
      if (userIds.length > 0) {
        const groupMembers = userIds.map(userId => ({
          group_id: group.id,
          user_id: userId
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
        },
        loginInfo: {
          message: 'You can login with any user. All passwords are: Demo123!',
          exampleUsers: [
            'user1@apex-demo.com (Directors)',
            'user16@apex-demo.com (Executive Directors)',
            'user21@apex-demo.com (Admin)',
            'user41@apex-demo.com (SPO)',
            'user91@apex-demo.com (PO)'
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
