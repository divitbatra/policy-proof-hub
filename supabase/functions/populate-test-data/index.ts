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

    console.log('Starting data population...')

    // 1. Delete existing test data
    console.log('Cleaning up existing test data...')
    
    // Get all test users first
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const testUserIds: string[] = []
    
    if (allUsers) {
      for (const user of allUsers) {
        if (user.email?.includes('@apex-demo.com')) {
          testUserIds.push(user.id)
        }
      }
    }

    console.log(`Found ${testUserIds.length} existing test users to delete`)

    if (testUserIds.length > 0) {
      // Delete in correct order to avoid foreign key constraints
      
      // 1. Delete attestations
      await supabaseAdmin.from('attestations').delete().in('user_id', testUserIds)
      
      // 2. Delete assessment results
      await supabaseAdmin.from('assessment_results').delete().in('user_id', testUserIds)
      
      // 3. Delete policy assignments
      await supabaseAdmin.from('policy_assignments').delete().in('user_id', testUserIds)
      await supabaseAdmin.from('policy_assignments').delete().in('assigned_by', testUserIds)
      
      // 4. Delete group members
      await supabaseAdmin.from('group_members').delete().in('user_id', testUserIds)
      
      // 5. Delete policies created by test users
      await supabaseAdmin.from('policies').delete().in('created_by', testUserIds)
      
      // 6. Delete profiles
      await supabaseAdmin.from('profiles').delete().in('id', testUserIds)
      
      console.log('Deleted all related data for test users')
    }
    
    // Delete existing test groups
    await supabaseAdmin
      .from('groups')
      .delete()
      .in('name', ['Admin', 'Directors', 'Executive Directors', 'Supervisor Probation Officers', 'Probation Officers'])

    // Delete test users from auth (should work now that all related data is gone)
    for (const userId of testUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        console.log(`Deleted user ${userId}`)
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error)
      }
    }
    
    console.log('Cleanup complete')

    // Wait longer for auth deletions to fully propagate
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 2. Create Groups
    console.log('Creating groups...')
    const groups = [
      { name: 'Admin', description: 'Administrative staff', userCount: 10 },
      { name: 'Directors', description: 'Department directors', userCount: 10 },
      { name: 'Executive Directors', description: 'Executive leadership', userCount: 5 },
      { name: 'Supervisor Probation Officers', description: 'Supervisory staff', userCount: 50 },
      { name: 'Probation Officers', description: 'Front-line probation officers', userCount: 221 }
    ]

    const createdGroups = []
    for (const group of groups) {
      const { data, error } = await supabaseAdmin
        .from('groups')
        .insert({ name: group.name, description: group.description })
        .select()
        .single()
      
      if (error) throw error
      createdGroups.push({ ...data, userCount: group.userCount })
      console.log(`Created group: ${group.name}`)
    }

    // 3. Create Users and assign to groups
    console.log('Creating users...')
    let userIndex = 1
    const allUserIds: string[] = []

    for (const group of createdGroups) {
      const userIds: string[] = []
      
      for (let i = 0; i < group.userCount; i++) {
        const email = `user${userIndex}@apex-demo.com`
        const password = 'Demo123!'
        const fullName = `${group.name} User ${i + 1}`
        
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName
          }
        })

        if (authError) {
          // If user already exists, fetch their ID instead of failing
          if (authError.message?.includes('already been registered')) {
            console.log(`User ${email} already exists, fetching ID...`)
            const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
            const foundUser = existingUser.users.find(u => u.email === email)
            if (foundUser) {
              userIds.push(foundUser.id)
              allUserIds.push(foundUser.id)
              
              // Update profile for existing user
              await supabaseAdmin
                .from('profiles')
                .update({
                  full_name: fullName,
                  department: group.name,
                  role: group.name === 'Admin' ? 'admin' : 'employee'
                })
                .eq('id', foundUser.id)
            }
            userIndex++
            continue
          }
          console.error(`Error creating user ${email}:`, authError)
          userIndex++
          continue
        }

        const userId = authData.user.id
        userIds.push(userId)
        allUserIds.push(userId)

        // Update profile
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: fullName,
            department: group.name,
            role: group.name === 'Admin' ? 'admin' : 'employee'
          })
          .eq('id', userId)

        userIndex++
        
        if (userIndex % 10 === 0) {
          console.log(`Created ${userIndex} users...`)
        }
      }

      // Add users to group
      const groupMembers = userIds.map(userId => ({
        group_id: group.id,
        user_id: userId
      }))

      const { error: memberError } = await supabaseAdmin
        .from('group_members')
        .insert(groupMembers)

      if (memberError) throw memberError
      console.log(`Added ${userIds.length} members to ${group.name}`)
    }

    console.log(`Total users created: ${allUserIds.length}`)

    // 3. Get an admin user for policy creation
    const adminUser = allUserIds[0] // First user is an admin

    // 4. Create Policies
    console.log('Creating policies...')
    const policyPromises = []
    
    for (let i = 0; i < 798; i++) {
      const category = policyCategories[i % policyCategories.length]
      const title = generatePolicyTitle(i, category)
      const description = generatePolicyDescription(category)
      
      policyPromises.push(
        supabaseAdmin
          .from('policies')
          .insert({
            title,
            description,
            category,
            status: 'published',
            created_by: adminUser
          })
          .select()
          .single()
      )

      // Batch insert every 50 policies
      if (policyPromises.length >= 50) {
        await Promise.all(policyPromises)
        console.log(`Created ${i + 1} policies...`)
        policyPromises.length = 0
      }
    }

    // Insert remaining policies
    if (policyPromises.length > 0) {
      await Promise.all(policyPromises)
    }

    console.log('Created 798 policies')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test data populated successfully',
        stats: {
          groups: createdGroups.length,
          users: allUserIds.length,
          policies: 798
        },
        loginInfo: {
          message: 'You can login with any user. All passwords are: Demo123!',
          exampleUsers: [
            'user1@apex-demo.com (Admin)',
            'user11@apex-demo.com (Director)',
            'user21@apex-demo.com (Executive Director)',
            'user26@apex-demo.com (Supervisor Probation Officer)',
            'user76@apex-demo.com (Probation Officer)'
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
