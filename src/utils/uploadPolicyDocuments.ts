import { supabase } from "@/integrations/supabase/client";

interface PolicyVersion {
  id: string;
  file_name: string;
  policy_type: 'remote_work' | 'data_security' | 'code_of_conduct' | 'expense_reimbursement';
}

const policyVersions: PolicyVersion[] = [
  // Remote Work Policy versions
  { id: '30000000-0000-0000-0000-000000000001', file_name: 'remote_work_v1.pdf', policy_type: 'remote_work' },
  { id: '30000000-0000-0000-0000-000000000004', file_name: 'remote_work_v2.pdf', policy_type: 'remote_work' },
  { id: '30000000-0000-0000-0000-000000000005', file_name: 'remote_work_v3.pdf', policy_type: 'remote_work' },
  // Data Security Policy versions
  { id: '30000000-0000-0000-0000-000000000002', file_name: 'data_security_v1.pdf', policy_type: 'data_security' },
  { id: '30000000-0000-0000-0000-000000000006', file_name: 'data_security_v2.pdf', policy_type: 'data_security' },
  { id: '30000000-0000-0000-0000-000000000007', file_name: 'data_security_v3.pdf', policy_type: 'data_security' },
  // Code of Conduct versions
  { id: '30000000-0000-0000-0000-000000000003', file_name: 'code_of_conduct_v1.pdf', policy_type: 'code_of_conduct' },
  { id: '30000000-0000-0000-0000-000000000008', file_name: 'code_of_conduct_v2.pdf', policy_type: 'code_of_conduct' },
  // Expense Reimbursement versions
  { id: '30000000-0000-0000-0000-000000000009', file_name: 'expense_reimbursement_v1.pdf', policy_type: 'expense_reimbursement' },
  { id: '30000000-0000-0000-0000-000000000010', file_name: 'expense_reimbursement_v2.pdf', policy_type: 'expense_reimbursement' },
  { id: '30000000-0000-0000-0000-000000000011', file_name: 'expense_reimbursement_v3.pdf', policy_type: 'expense_reimbursement' },
];

const policyTypeToFile: Record<string, string> = {
  'remote_work': '/temp/remote_work.pdf',
  'data_security': '/temp/data_security.pdf',
  'code_of_conduct': '/temp/code_of_conduct.pdf',
  'expense_reimbursement': '/temp/expense_reimbursement.pdf',
};

export const uploadPolicyDocuments = async () => {
  console.log('Starting policy document upload...');
  
  for (const version of policyVersions) {
    try {
      // Fetch the source PDF from public folder
      const sourcePath = policyTypeToFile[version.policy_type];
      const response = await fetch(sourcePath);
      
      if (!response.ok) {
        console.error(`Failed to fetch ${sourcePath}`);
        continue;
      }
      
      const blob = await response.blob();
      const file = new File([blob], version.file_name, { type: 'application/pdf' });
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('policy-documents')
        .upload(version.file_name, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error(`Error uploading ${version.file_name}:`, error);
        continue;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('policy-documents')
        .getPublicUrl(version.file_name);
      
      // Update the policy_versions table with the correct URL
      const { error: updateError } = await supabase
        .from('policy_versions')
        .update({ 
          file_url: publicUrl,
          file_size: file.size
        })
        .eq('id', version.id);
      
      if (updateError) {
        console.error(`Error updating policy_version ${version.id}:`, updateError);
      } else {
        console.log(`✓ Uploaded and updated ${version.file_name}`);
      }
      
    } catch (err) {
      console.error(`Exception uploading ${version.file_name}:`, err);
    }
  }
  
  console.log('Policy document upload complete!');
};
