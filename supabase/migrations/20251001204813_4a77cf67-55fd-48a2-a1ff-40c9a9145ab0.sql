-- Create sample groups
INSERT INTO groups (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Engineering Team', 'All engineering department members'),
  ('10000000-0000-0000-0000-000000000002', 'Sales Team', 'Sales and business development'),
  ('10000000-0000-0000-0000-000000000003', 'Management', 'Leadership and executives');

-- Create sample policies
INSERT INTO policies (id, title, description, category, status, created_by) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Remote Work Policy', 'Guidelines for remote and hybrid work arrangements', 'HR', 'published', '4e68283d-e3f5-4ab7-a680-c488e633efd5'),
  ('20000000-0000-0000-0000-000000000002', 'Data Security Policy', 'Protecting company and customer data', 'Security', 'published', '4e68283d-e3f5-4ab7-a680-c488e633efd5'),
  ('20000000-0000-0000-0000-000000000003', 'Code of Conduct', 'Professional behavior and ethics standards', 'Compliance', 'published', '4e68283d-e3f5-4ab7-a680-c488e633efd5'),
  ('20000000-0000-0000-0000-000000000004', 'Expense Reimbursement', 'Process for submitting and approving expenses', 'Finance', 'draft', '4e68283d-e3f5-4ab7-a680-c488e633efd5');

-- Create policy versions
INSERT INTO policy_versions (id, policy_id, version_number, file_name, file_url, file_size, change_summary, published_at, published_by) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'remote_work_v1.pdf', 'https://example.com/remote_work_v1.pdf', 245000, 'Initial version', now() - interval '30 days', '4e68283d-e3f5-4ab7-a680-c488e633efd5'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 'data_security_v1.pdf', 'https://example.com/data_security_v1.pdf', 512000, 'Initial version', now() - interval '60 days', '4e68283d-e3f5-4ab7-a680-c488e633efd5'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 1, 'code_of_conduct_v1.pdf', 'https://example.com/code_of_conduct_v1.pdf', 384000, 'Initial version', now() - interval '90 days', '4e68283d-e3f5-4ab7-a680-c488e633efd5');

-- Update policies with current versions
UPDATE policies SET current_version_id = '30000000-0000-0000-0000-000000000001' WHERE id = '20000000-0000-0000-0000-000000000001';
UPDATE policies SET current_version_id = '30000000-0000-0000-0000-000000000002' WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE policies SET current_version_id = '30000000-0000-0000-0000-000000000003' WHERE id = '20000000-0000-0000-0000-000000000003';

-- Create policy assignments
INSERT INTO policy_assignments (policy_id, group_id, assigned_by, due_date) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '4e68283d-e3f5-4ab7-a680-c488e633efd5', now() + interval '7 days'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '4e68283d-e3f5-4ab7-a680-c488e633efd5', now() + interval '14 days'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '4e68283d-e3f5-4ab7-a680-c488e633efd5', now() + interval '30 days');