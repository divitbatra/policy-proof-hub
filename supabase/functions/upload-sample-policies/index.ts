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

    console.log('Starting to upload sample policy documents...');

    // Sample PDF files to upload (mapping policy keywords to files)
    const samplePolicies = [
      { keyword: 'code of conduct', file: 'code_of_conduct.pdf' },
      { keyword: 'data', file: 'data_security.pdf' },
      { keyword: 'expense', file: 'expense_reimbursement.pdf' },
      { keyword: 'remote', file: 'remote_work.pdf' },
    ];

    let uploadedCount = 0;

    // Get all policies
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('id, title, current_version_id');
    
    if (policiesError) throw policiesError;

    for (const policy of policies) {
      // Find matching sample file
      const matchingFile = samplePolicies.find(s => 
        policy.title.toLowerCase().includes(s.keyword)
      );
      
      if (!matchingFile) {
        console.log(`No matching sample file for: ${policy.title}`);
        continue;
      }

      // Fetch the PDF from the public folder
      const pdfUrl = `${supabaseUrl.replace('//', '//').split('/')[0]}//${supabaseUrl.replace('//', '//').split('/')[2]}/temp/${matchingFile.file}`;
      console.log(`Fetching PDF from: ${pdfUrl}`);
      
      let pdfBlob;
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${matchingFile.file}: ${response.status}`);
          continue;
        }
        pdfBlob = await response.blob();
      } catch (fetchError) {
        console.error(`Error fetching ${matchingFile.file}:`, fetchError);
        continue;
      }

      // Upload to storage
      const fileName = `${policy.id}/${matchingFile.file}`;
      const { error: uploadError } = await supabase.storage
        .from('policy-documents')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error(`Error uploading ${fileName}:`, uploadError);
        continue;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('policy-documents')
        .getPublicUrl(fileName);

      // Get current version or create new one
      let versionId = policy.current_version_id;
      
      if (!versionId) {
        // Create a new version
        const { data: newVersion, error: versionError } = await supabase
          .from('policy_versions')
          .insert({
            policy_id: policy.id,
            version_number: 1,
            file_url: urlData.publicUrl,
            file_name: matchingFile.file,
            file_size: pdfBlob.size,
            change_summary: 'Initial version uploaded with sample document'
          })
          .select()
          .single();

        if (versionError) {
          console.error('Error creating version:', versionError);
          continue;
        }

        versionId = newVersion.id;

        // Update policy with current_version_id
        await supabase
          .from('policies')
          .update({ current_version_id: versionId })
          .eq('id', policy.id);
      } else {
        // Update existing version
        await supabase
          .from('policy_versions')
          .update({
            file_url: urlData.publicUrl,
            file_name: matchingFile.file,
            file_size: pdfBlob.size
          })
          .eq('id', versionId);
      }

      uploadedCount++;
      console.log(`Uploaded ${matchingFile.file} for ${policy.title}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Uploaded ${uploadedCount} policy documents`,
        uploadedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
