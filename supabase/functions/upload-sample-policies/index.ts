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

    let uploadedCount = 0;

    // Get all policies with their versions
    const { data: policies, error: policiesError } = await supabase
      .from('policies')
      .select('id, title, current_version_id');
    
    if (policiesError) throw policiesError;

    for (const policy of policies) {
      console.log(`Processing policy: ${policy.title}`);

      // Generate a simple PDF placeholder (since we can't access public folder from edge function)
      // Create a minimal PDF structure
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 80 >>
stream
BT
/F1 24 Tf
100 700 Td
(${policy.title}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000304 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
435
%%EOF`;
      
      const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });

      // Upload to storage
      const fileName = `${policy.id}/sample_document_v1.pdf`;
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
            file_name: 'sample_document_v1.pdf',
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
            file_name: 'sample_document_v1.pdf',
            file_size: pdfBlob.size
          })
          .eq('id', versionId);
      }

      uploadedCount++;
      console.log(`Uploaded sample document for ${policy.title}`);
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
