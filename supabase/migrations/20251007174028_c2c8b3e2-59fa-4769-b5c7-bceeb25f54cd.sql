-- Populate policy_versions table with multiple versions for each policy
-- This will give each policy a different number of historical versions

-- For "Expense Reimbursement Policy" - add 4 more versions (total 5)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'Expense Reimbursement Policy'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT 
  policy_id, 2, 'expense_reimbursement_v2.pdf', file_url,
  'Updated expense limits and approval workflow',
  created_at + interval '7 days'
FROM base_version
UNION ALL
SELECT policy_id, 3, 'expense_reimbursement_v3.pdf', file_url,
  'Added international travel expenses section',
  created_at + interval '14 days'
FROM base_version
UNION ALL
SELECT policy_id, 4, 'expense_reimbursement_v4.pdf', file_url,
  'Clarified per diem rates',
  created_at + interval '21 days'
FROM base_version
UNION ALL
SELECT policy_id, 5, 'expense_reimbursement_v5.pdf', file_url,
  'Updated for 2025 fiscal year',
  created_at + interval '28 days'
FROM base_version;

-- For "Code of Conduct" - add 2 more versions (total 3)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'Code of Conduct'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT policy_id, 2, 'code_of_conduct_v2.pdf', file_url,
  'Added remote work conduct guidelines',
  created_at + interval '10 days'
FROM base_version
UNION ALL
SELECT policy_id, 3, 'code_of_conduct_v3.pdf', file_url,
  'Enhanced social media usage policies',
  created_at + interval '20 days'
FROM base_version;

-- For "Remote Work Policy" - add 3 more versions (total 4)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'Remote Work Policy'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT policy_id, 2, 'remote_work_v2.pdf', file_url,
  'Added equipment requirements',
  created_at + interval '5 days'
FROM base_version
UNION ALL
SELECT policy_id, 3, 'remote_work_v3.pdf', file_url,
  'Updated communication expectations',
  created_at + interval '12 days'
FROM base_version
UNION ALL
SELECT policy_id, 4, 'remote_work_v4.pdf', file_url,
  'Added cybersecurity requirements for remote work',
  created_at + interval '19 days'
FROM base_version;

-- For "Data Classification Policy" - add 1 more version (total 2)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'Data Classification Policy'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT policy_id, 2, 'data_classification_v2.pdf', file_url,
  'Updated classification levels and handling procedures',
  created_at + interval '15 days'
FROM base_version;

-- For "Password Security Policy" - add 5 more versions (total 6)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'Password Security Policy'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT policy_id, 2, 'password_security_v2.pdf', file_url,
  'Increased minimum password length to 12 characters',
  created_at + interval '3 days'
FROM base_version
UNION ALL
SELECT policy_id, 3, 'password_security_v3.pdf', file_url,
  'Added multi-factor authentication requirements',
  created_at + interval '8 days'
FROM base_version
UNION ALL
SELECT policy_id, 4, 'password_security_v4.pdf', file_url,
  'Removed security questions requirement',
  created_at + interval '13 days'
FROM base_version
UNION ALL
SELECT policy_id, 5, 'password_security_v5.pdf', file_url,
  'Added password manager recommendations',
  created_at + interval '18 days'
FROM base_version
UNION ALL
SELECT policy_id, 6, 'password_security_v6.pdf', file_url,
  'Updated for new authentication system',
  created_at + interval '23 days'
FROM base_version;

-- For "GDPR Compliance Policy" - add 2 more versions (total 3)
WITH base_version AS (
  SELECT pv.file_url, p.id as policy_id, p.created_at
  FROM policies p
  JOIN policy_versions pv ON p.id = pv.policy_id
  WHERE p.title = 'GDPR Compliance Policy'
  LIMIT 1
)
INSERT INTO policy_versions (policy_id, version_number, file_name, file_url, change_summary, created_at)
SELECT policy_id, 2, 'gdpr_compliance_v2.pdf', file_url,
  'Added data retention schedules',
  created_at + interval '11 days'
FROM base_version
UNION ALL
SELECT policy_id, 3, 'gdpr_compliance_v3.pdf', file_url,
  'Enhanced data subject rights procedures',
  created_at + interval '22 days'
FROM base_version;