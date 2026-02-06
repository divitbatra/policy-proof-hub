import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Real policy content samples
const policyTemplates = [
  {
    category: 'Code of Conduct',
    title: 'Code of Conduct Policy',
    description: 'Professional behavior and ethical standards expected of all employees',
    content: `# Code of Conduct Policy

## Purpose
This policy establishes the standards of conduct expected of all employees to maintain a professional, respectful, and productive workplace.

## Core Values
- Integrity and honesty in all business dealings
- Respect for all individuals regardless of position, background, or beliefs
- Commitment to excellence and continuous improvement
- Accountability for actions and decisions

## Expected Behaviors
1. Treat colleagues, clients, and stakeholders with dignity and respect
2. Maintain confidentiality of sensitive information
3. Avoid conflicts of interest
4. Report violations of policies or unethical behavior
5. Comply with all applicable laws and regulations

## Prohibited Conduct
- Harassment or discrimination of any kind
- Dishonesty or fraud
- Misuse of company resources
- Violation of confidentiality agreements
- Retaliation against those who report concerns

## Consequences
Violations may result in disciplinary action up to and including termination of employment.`
  },
  {
    category: 'Data Security',
    title: 'Data Security and Privacy Policy',
    description: 'Guidelines for protecting sensitive information and maintaining data security',
    content: `# Data Security and Privacy Policy

## Overview
This policy outlines requirements for protecting company and client data from unauthorized access, use, disclosure, or destruction.

## Data Classification
### Confidential Data
- Personal identifying information (PII)
- Financial records
- Trade secrets and proprietary information
- Client confidential information

### Internal Data
- Employee records
- Internal communications
- Draft documents
- Operational procedures

### Public Data
- Published marketing materials
- Public website content
- Press releases

## Security Requirements
1. Use strong passwords (minimum 12 characters, mixed case, numbers, symbols)
2. Enable multi-factor authentication on all accounts
3. Encrypt sensitive data at rest and in transit
4. Lock screens when away from workstation
5. Report security incidents immediately

## Data Handling
- Access data only as needed for job duties
- Do not share login credentials
- Securely dispose of sensitive documents (shred paper, wipe digital media)
- Use approved cloud storage solutions only
- Do not store company data on personal devices without authorization

## Incident Response
Report suspected breaches to IT Security within 1 hour of discovery.`
  },
  {
    category: 'Remote Work',
    title: 'Remote Work Policy',
    description: 'Guidelines and requirements for employees working remotely',
    content: `# Remote Work Policy

## Eligibility
Full-time employees who have completed probationary period and whose roles are suitable for remote work may apply.

## Requirements
### Technology
- Secure, high-speed internet connection (minimum 25 Mbps)
- Dedicated workspace free from distractions
- Company-provided laptop and equipment
- VPN access for secure connection

### Work Hours
- Available during core business hours (9 AM - 3 PM local time)
- Responsive to emails and messages within 2 hours
- Attend all required meetings virtually
- Maintain regular communication with team

### Security
- Use only company-approved devices
- Secure home network with strong password
- Do not allow others to use company equipment
- Follow all data security policies
- Ensure privacy during video calls

## Performance Expectations
Remote employees are held to the same standards as in-office employees regarding:
- Quality of work
- Productivity
- Communication
- Meeting deadlines
- Professional conduct

## Equipment
Company provides:
- Laptop computer
- Monitor (if requested)
- Headset
- Necessary software licenses

Employee responsible for:
- Internet connection
- Workspace furniture
- Phone service

## Review
Remote work arrangements are reviewed quarterly and may be modified or revoked based on business needs or performance.`
  },
  {
    category: 'Expense Reimbursement',
    title: 'Expense Reimbursement Policy',
    description: 'Procedures for submitting and approving business expense reimbursements',
    content: `# Expense Reimbursement Policy

## Purpose
To establish guidelines for reimbursing employees for reasonable and necessary business expenses.

## Eligible Expenses
### Travel
- Airfare (economy class)
- Hotel accommodation (standard room)
- Ground transportation (taxi, rideshare, rental car)
- Mileage for personal vehicle use ($0.67/mile)
- Parking and tolls

### Meals
- Business meals with clients or colleagues
- Meals during business travel
- Daily limits: Breakfast $15, Lunch $25, Dinner $50

### Other
- Office supplies
- Professional development (pre-approved)
- Client entertainment (pre-approved)
- Mobile phone for business use (50% of bill)

## Requirements
### Documentation
- Original itemized receipts for expenses over $25
- Credit card statements not acceptable as sole documentation
- Business purpose and attendees for meals
- Mileage log with dates, destinations, and business purpose

### Submission
- Submit within 30 days of expense
- Use company expense report form
- Obtain manager approval before submission
- Finance processes within 14 days of approval

## Non-Reimbursable Expenses
- Personal meals and entertainment
- Alcoholic beverages (except client entertainment)
- Traffic violations and parking tickets
- Personal grooming and toiletries
- Upgrade fees (flights, hotels, rental cars)
- Expenses for family members or guests

## Violations
Falsification of expense reports may result in termination and criminal prosecution.`
  },
  {
    category: 'Leave Policy',
    title: 'Paid Time Off Policy',
    description: 'Guidelines for vacation, sick leave, and other paid time off',
    content: `# Paid Time Off Policy

## Overview
All full-time employees accrue paid time off (PTO) for vacation, illness, and personal needs.

## Accrual Rates
### Years 0-2
- 15 days per year
- 1.25 days per month
- 0.577 hours per day worked

### Years 3-5
- 20 days per year
- 1.67 days per month
- 0.769 hours per day worked

### Years 6+
- 25 days per year
- 2.08 days per month
- 0.962 hours per day worked

## Usage Guidelines
### Advance Notice
- 2 weeks notice for 5+ consecutive days
- 1 week notice for 3-4 consecutive days
- 24 hours notice for 1-2 days (when possible)

### Approval
- Requests subject to manager approval
- Blackout periods may apply during peak business seasons
- Coverage must be arranged before extended absences

### Sick Leave
- No advance notice required for illness
- Medical documentation required for 3+ consecutive days
- May be used for personal illness or care of immediate family member

## Maximum Accrual
- Cap at 1.5x annual accrual rate
- Use-it-or-lose-it after reaching cap
- No payout for unused PTO except upon termination (where required by law)

## Holidays
In addition to PTO, company observes 10 paid holidays:
- New Year's Day
- Martin Luther King Jr. Day
- Memorial Day
- Independence Day
- Labor Day
- Thanksgiving (2 days)
- Christmas (2 days)
- One floating holiday

## Part-Time Employees
PTO prorated based on hours worked.`
  }
]

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

    console.log('Starting cleanup and population...')

    // Use authenticated user as the protected user
    const currentUserId = authenticatedUserId

    // 2. Get all users to delete (except the protected one)
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const usersToDelete: string[] = []
    
    if (allUsers) {
      for (const user of allUsers) {
        if (user.id !== currentUserId) {
          usersToDelete.push(user.id)
        }
      }
    }

    console.log(`Found ${usersToDelete.length} users to delete`)

    // 3. Delete all data in correct order
    if (usersToDelete.length > 0) {
      console.log('Deleting attestations...')
      await supabaseAdmin.from('attestations').delete().in('user_id', usersToDelete)
      
      console.log('Deleting assessment results...')
      await supabaseAdmin.from('assessment_results').delete().in('user_id', usersToDelete)
      
      console.log('Deleting policy assignments...')
      await supabaseAdmin.from('policy_assignments').delete().in('user_id', usersToDelete)
      await supabaseAdmin.from('policy_assignments').delete().in('assigned_by', usersToDelete)
      
      console.log('Deleting group members...')
      await supabaseAdmin.from('group_members').delete().in('user_id', usersToDelete)
      
      console.log('Deleting policies created by users...')
      await supabaseAdmin.from('policies').delete().in('created_by', usersToDelete)
      
      console.log('Deleting profiles...')
      await supabaseAdmin.from('profiles').delete().in('id', usersToDelete)
      
      console.log('Deleting auth users...')
      for (const uid of usersToDelete) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(uid)
        } catch (error) {
          console.error(`Error deleting user ${uid}:`, error)
        }
      }
    }

    // 4. Delete ALL policies (no conditions)
    console.log('Deleting all policies...')
    const { data: allPolicies } = await supabaseAdmin.from('policies').select('id')
    if (allPolicies && allPolicies.length > 0) {
      const policyIds = allPolicies.map(p => p.id)
      await supabaseAdmin.from('policy_versions').delete().in('policy_id', policyIds)
      await supabaseAdmin.from('assessments').delete().in('policy_id', policyIds)
      await supabaseAdmin.from('policies').delete().in('id', policyIds)
      console.log(`Deleted ${allPolicies.length} policies`)
    }

    console.log('Creating 798 policies...')
    
    // Create policies in batches
    const policies = []
    const batchSize = 50
    
    for (let i = 0; i < 798; i++) {
      const template = policyTemplates[i % policyTemplates.length]
      const versionNum = Math.floor(i / policyTemplates.length) + 1
      
      policies.push({
        title: `${template.title} - Version ${versionNum}`,
        description: template.description,
        category: template.category,
        status: 'published',
        created_by: currentUserId
      })
      
      // Insert in batches
      if (policies.length >= batchSize) {
        await supabaseAdmin.from('policies').insert(policies)
        console.log(`Created ${i + 1} policies...`)
        policies.length = 0
      }
    }
    
    // Insert remaining policies
    if (policies.length > 0) {
      await supabaseAdmin.from('policies').insert(policies)
    }

    console.log('Cleanup and population complete!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database cleaned and populated successfully',
        stats: {
          usersDeleted: usersToDelete.length,
          policiesCreated: 798
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
