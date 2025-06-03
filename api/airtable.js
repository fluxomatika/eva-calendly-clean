// 🗂️ AIRTABLE INTEGRATION API - EVA SYSTEM
// Clean implementation without syntax errors
// Status: Production ready

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🗂️ Airtable API called:', req.method);
    
    // Environment validation
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return res.status(500).json({
        success: false,
        error: 'Missing Airtable configuration',
        message: 'AIRTABLE_API_KEY or AIRTABLE_BASE_ID not configured'
      });
    }

    const { action } = req.query;
    
    switch (action) {
      case 'test':
        return await testConnection(req, res);
      case 'create':
        return await createLead(req, res);
      case 'list':
        return await listLeads(req, res);
      case 'update':
        return await updateLead(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          available_actions: ['test', 'create', 'list', 'update']
        });
    }
  } catch (error) {
    console.error('❌ Airtable API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
}

// Test Airtable connection
async function testConnection(req, res) {
  try {
    console.log('🔧 Testing Airtable connection...');
    
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable response error:', response.status, errorText);
      
      return res.status(response.status).json({
        success: false,
        error: `Airtable API error: ${response.status}`,
        details: errorText,
        message: 'Failed to connect to Airtable'
      });
    }

    const data = await response.json();
    console.log('✅ Airtable connection successful');

    return res.status(200).json({
      success: true,
      message: 'Airtable connection successful',
      data: {
        base_id: process.env.AIRTABLE_BASE_ID,
        table: 'Leads',
        records_found: data.records ? data.records.length : 0,
        connection_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Connection test failed'
    });
  }
}

// Create new lead
async function createLead(req, res) {
  try {
    console.log('📝 Creating new lead...');
    
    const leadData = req.method === 'POST' ? req.body : req.query;
    
    // Validate required fields
    if (!leadData.name || !leadData.email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'email']
      });
    }

    // Generate unique Lead ID
    const leadId = `LEAD_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    const record = {
      fields: {
        'Lead ID': leadId,
        'Nome': leadData.name,
        'Email': leadData.email,
        'Telefone': leadData.phone || '',
        'Empresa': leadData.company || '',
        'Cargo': leadData.role || '',
        'Fonte': leadData.source || 'website',
        'Interesse': leadData.interest || '',
        'Status': 'novo',
        'Eva Ligou': false,
        'Contador Ligações': 0,
        'WhatsApp Enviado': false,
        'Notas': `Lead criado via API em ${new Date().toLocaleString('pt-BR')}`
      }
    };

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records: [record] })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to create lead:', response.status, errorText);
      
      return res.status(response.status).json({
        success: false,
        error: `Failed to create lead: ${response.status}`,
        details: errorText
      });
    }

    const result = await response.json();
    console.log('✅ Lead created successfully:', leadId);

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: {
        lead_id: leadId,
        airtable_id: result.records[0].id,
        fields: result.records[0].fields
      }
    });

  } catch (error) {
    console.error('❌ Error creating lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create lead'
    });
  }
}

// List leads
async function listLeads(req, res) {
  try {
    console.log('📋 Fetching leads...');
    
    const { limit = 10, status, source } = req.query;
    
    let filterFormula = '';
    const filters = [];
    
    if (status) {
      filters.push(`{Status} = '${status}'`);
    }
    
    if (source) {
      filters.push(`{Fonte} = '${source}'`);
    }
    
    if (filters.length > 0) {
      filterFormula = `?filterByFormula=AND(${filters.join(',')})`;
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads${filterFormula}&maxRecords=${limit}&sort[0][field]=Criado em&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch leads: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log(`✅ Found ${data.records.length} leads`);

    return res.status(200).json({
      success: true,
      message: `Found ${data.records.length} leads`,
      data: {
        leads: data.records.map(record => ({
          id: record.fields['Lead ID'],
          airtable_id: record.id,
          name: record.fields['Nome'],
          email: record.fields['Email'],
          company: record.fields['Empresa'],
          status: record.fields['Status'],
          source: record.fields['Fonte'],
          eva_called: record.fields['Eva Ligou'] || false,
          created: record.fields['Criado em']
        })),
        total: data.records.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch leads'
    });
  }
}

// Update lead
async function updateLead(req, res) {
  try {
    console.log('✏️ Updating lead...');
    
    const { id } = req.query;
    const updateData = req.method === 'POST' ? req.body : req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing lead ID',
        message: 'Please provide lead ID to update'
      });
    }

    // First, find the record by Lead ID
    const searchResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads?filterByFormula={Lead ID}='${id}'`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!searchResponse.ok) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        message: `No lead found with ID: ${id}`
      });
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        message: `No lead found with ID: ${id}`
      });
    }

    const recordId = searchData.records[0].id;
    
    // Prepare update fields
    const updateFields = {};
    
    if (updateData.status) updateFields['Status'] = updateData.status;
    if (updateData.eva_called !== undefined) updateFields['Eva Ligou'] = updateData.eva_called;
    if (updateData.whatsapp_sent !== undefined) updateFields['WhatsApp Enviado'] = updateData.whatsapp_sent;
    if (updateData.notes) updateFields['Notas'] = updateData.notes;
    
    // Update record
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updateFields
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return res.status(updateResponse.status).json({
        success: false,
        error: `Failed to update lead: ${updateResponse.status}`,
        details: errorText
      });
    }

    const result = await updateResponse.json();
    console.log('✅ Lead updated successfully:', id);

    return res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: {
        lead_id: id,
        airtable_id: recordId,
        updated_fields: updateFields,
        fields: result.fields
      }
    });

  } catch (error) {
    console.error('❌ Error updating lead:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to update lead'
    });
  }
}
