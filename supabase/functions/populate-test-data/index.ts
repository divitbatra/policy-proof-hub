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

    // 1. Create Groups
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

    // 2. Create Users and assign to groups
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
          console.error(`Error creating user ${email}:`, authError)
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
