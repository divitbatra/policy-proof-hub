-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'publisher', 'employee');

-- Create policy status enum
CREATE TYPE policy_status AS ENUM ('draft', 'review', 'published', 'archived');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create group members junction table
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create policies table (main policy repository)
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status policy_status NOT NULL DEFAULT 'draft',
  current_version_id UUID,
  category TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create policy versions table (immutable archive)
CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(policy_id, version_number)
);

-- Add foreign key for current version
ALTER TABLE policies ADD CONSTRAINT fk_current_version 
  FOREIGN KEY (current_version_id) REFERENCES policy_versions(id);

-- Create policy assignments table (targeted distribution)
CREATE TABLE policy_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((group_id IS NOT NULL) OR (user_id IS NOT NULL))
);

-- Create attestations table (e-signatures)
CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  assessment_score INTEGER,
  assessment_passed BOOLEAN,
  UNIQUE(policy_version_id, user_id)
);

-- Create assessments table (comprehension tests)
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_score INTEGER NOT NULL DEFAULT 80,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment questions table
CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment question options table
CREATE TABLE assessment_question_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  option_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment results table
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit logs table (immutable trail)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for groups (admin/publisher can manage)
CREATE POLICY "Users can view groups" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can manage groups" ON groups FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for group_members
CREATE POLICY "Users can view group members" ON group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can manage group members" ON group_members FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for policies
CREATE POLICY "Users can view published policies" ON policies FOR SELECT TO authenticated 
  USING (status = 'published' OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));
CREATE POLICY "Admin/Publisher can manage policies" ON policies FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for policy_versions
CREATE POLICY "Users can view policy versions" ON policy_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can create versions" ON policy_versions FOR INSERT TO authenticated 
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for policy_assignments
CREATE POLICY "Users can view own assignments" ON policy_assignments FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));
CREATE POLICY "Admin/Publisher can manage assignments" ON policy_assignments FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for attestations
CREATE POLICY "Users can view own attestations" ON attestations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own attestations" ON attestations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/Publisher can view all attestations" ON attestations FOR SELECT TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for assessments
CREATE POLICY "Users can view assessments" ON assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can manage assessments" ON assessments FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for assessment_questions
CREATE POLICY "Users can view questions" ON assessment_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can manage questions" ON assessment_questions FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for assessment_question_options
CREATE POLICY "Users can view options" ON assessment_question_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Publisher can manage options" ON assessment_question_options FOR ALL TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for assessment_results
CREATE POLICY "Users can view own results" ON assessment_results FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create own results" ON assessment_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/Publisher can view all results" ON assessment_results FOR SELECT TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher'));

-- RLS Policies for audit_logs
CREATE POLICY "Admin can view audit logs" ON audit_logs FOR SELECT TO authenticated 
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "System can create audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'employee'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('policy-documents', 'policy-documents', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can view policy documents" 
  ON storage.objects FOR SELECT TO authenticated 
  USING (bucket_id = 'policy-documents');

CREATE POLICY "Admin/Publisher can upload policy documents" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'policy-documents' AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher')
  );

CREATE POLICY "Admin/Publisher can update policy documents" 
  ON storage.objects FOR UPDATE TO authenticated 
  USING (
    bucket_id = 'policy-documents' AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher')
  );

CREATE POLICY "Admin/Publisher can delete policy documents" 
  ON storage.objects FOR DELETE TO authenticated 
  USING (
    bucket_id = 'policy-documents' AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'publisher')
  );