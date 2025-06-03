// EVA CALENDLY - AIRTABLE LEADS API
// CRM Integration using documented structure from knowledge base
// File: /api/airtable-leads.js

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_LEADS = 'Leads';

// Generate unique Lead ID
const generateLeadId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LEAD_${timestamp}_${random}`.toUpperCase();
};

// Format phone number for Brazil
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add Brazil country code if needed
  if (digits.length === 11 && digits.startsWith('11')) {
    return `+55${digits}`;
  } else if (digits.length === 10) {
    return `+5511${digits}`;
  } else if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits}`;
  }
  
  return `+55${digits}`;
};

// Validate lead data according to Airtable structure
const validateLeadData = (data) => {
  const errors = [];

  if (!data.nome || data.nome.trim() === '') {
    errors.push('Nome é obrigatório');
  }

  if (!data.email || data.email.trim() === '') {
    errors.push('Email é obrigatório');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email && !emailRegex.test(data.email)) {
    errors.push('Formato de email inválido');
  }

  // Validate Fonte field
  const validSources = ['website', 'anuncios', 'indicacao', 'direto', 'whatsapp', 'linkedin', 'postman'];
  if (data.fonte && !validSources.includes(data.fonte)) {
    errors.push(`Fonte deve ser uma das opções: ${validSources.join(', ')}`);
  }

  // Validate Status field
  const validStatuses = ['novo', 'contatado', 'qualificado', 'reuniao_agendada', 'ganho', 'perdido'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Status deve ser uma das opções: ${validStatuses.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Create new lead in Airtable
const createLead = async (leadData) => {
  try {
    console.log('📝 Creating new lead in Airtable...');

    const leadId = generateLeadId();
    
    const record = {
      fields: {
        'Lead ID': leadId,
        'Nome': leadData.nome,
        'Email': leadData.email,
        'Telefone': formatPhoneNumber(leadData.telefone),
        'Empresa': leadData.empresa || '',
        'Cargo': leadData.cargo || '',
        'Fonte': leadData.fonte || 'website',
        'Interesse': leadData.interesse || '',
        'Status': leadData.status || 'novo',
        
        // Eva Automation fields
        'Eva Ligou': false,
        'Contador Ligações': 0,
        'WhatsApp Enviado': false,
        'Notas': `Lead criado via API em ${new Date().toLocaleString('pt-BR')}`,
        
        // Personality System fields (all fields now exist in Airtable)
        'Personalidade Recomendada': null,
        'Confiança Personalidade': null,
        'Estratégia Personalidade': null,
        'Análise Personalidade': null
      }
    };

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    console.log(`✅ Lead created successfully: ${leadId}`);
    
    return {
      success: true,
      lead_id: leadId,
      airtable_id: result.id,
      data: result
    };
  } catch (error) {
    console.error('❌ Error creating lead:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get lead by ID
const getLeadById = async (leadId) => {
  try {
    console.log(`🔍 Searching for lead: ${leadId}`);

    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}?filterByFormula={Lead ID}='${leadId}'`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.records && result.records.length > 0) {
      console.log(`✅ Lead found: ${leadId}`);
      return {
        success: true,
        lead: result.records[0]
      };
    } else {
      console.log(`❌ Lead not found: ${leadId}`);
      return {
        success: false,
        error: 'Lead não encontrado'
      };
    }
  } catch (error) {
    console.error('❌ Error getting lead:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update lead status and Eva automation fields
const updateLeadStatus = async (leadId, updateData) => {
  try {
    console.log(`🔄 Updating lead status: ${leadId}`);

    // First, find the record
    const leadResult = await getLeadById(leadId);
    if (!leadResult.success) {
      return leadResult;
    }

    const recordId = leadResult.lead.id;
    
    // Prepare update fields
    const updateFields = {};
    
    if (updateData.status) {
      updateFields['Status'] = updateData.status;
    }
    
    if (updateData.eva_ligou !== undefined) {
      updateFields['Eva Ligou'] = updateData.eva_ligou;
    }
    
    if (updateData.increment_calls) {
      const currentCount = leadResult.lead.fields['Contador Ligações'] || 0;
      updateFields['Contador Ligações'] = currentCount + 1;
      updateFields['Última Ligação'] = new Date().toISOString().split('T')[0];
    }
    
    if (updateData.whatsapp_sent) {
      updateFields['WhatsApp Enviado'] = true;
    }
    
    if (updateData.notas) {
      const currentNotes = leadResult.lead.fields['Notas'] || '';
      updateFields['Notas'] = `${currentNotes}\n\n[${new Date().toLocaleString('pt-BR')}] ${updateData.notas}`;
    }

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: updateFields
      })
    });

    if (!response.ok) {
      throw new Error(`Airtable update error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`✅ Lead updated successfully: ${leadId}`);
    
    return {
      success: true,
      lead_id: leadId,
      updated_fields: updateFields,
      data: result
    };
  } catch (error) {
    console.error('❌ Error updating lead:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// List all leads with optional filtering
const listLeads = async (filters = {}) => {
  try {
    console.log('📋 Listing leads from Airtable...');

    let filterFormula = '';
    
    if (filters.status) {
      filterFormula = `{Status}='${filters.status}'`;
    }
    
    if (filters.eva_ligou !== undefined) {
      const evaFilter = `{Eva Ligou}=${filters.eva_ligou}`;
      filterFormula = filterFormula ? `AND(${filterFormula}, ${evaFilter})` : evaFilter;
    }

    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}`;
    
    if (filterFormula) {
      url += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`✅ Found ${result.records.length} leads`);
    
    return {
      success: true,
      count: result.records.length,
      leads: result.records
    };
  } catch (error) {
    console.error('❌ Error listing leads:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Debug: List all available fields in Airtable
const debugAirtableFields = async () => {
  try {
    console.log('🔍 Debugging Airtable fields...');

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Debug failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.records && result.records.length > 0) {
      const fields = Object.keys(result.records[0].fields);
      console.log('📋 Available fields in Airtable:');
      fields.forEach((field, index) => {
        console.log(`${index + 1}. "${field}"`);
      });
      
      return {
        success: true,
        available_fields: fields,
        total_fields: fields.length
      };
    } else {
      return {
        success: false,
        error: 'No records found to analyze fields'
      };
    }
  } catch (error) {
    console.error('❌ Debug fields error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
  try {
    console.log('🔧 Testing Airtable connection...');

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_LEADS}?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Airtable connection successful');
    
    return {
      success: true,
      message: 'Airtable connection successful',
      base_id: AIRTABLE_BASE_ID,
      table: AIRTABLE_TABLE_LEADS,
      records_found: result.records.length
    };
  } catch (error) {
    console.error('❌ Airtable connection failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Main API handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`📊 Airtable Leads API called: ${req.method} ${req.url}`);
    
    const { action, ...params } = req.method === 'GET' ? req.query : req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action parameter is required',
        available_actions: ['create', 'get', 'update', 'list', 'test', 'debug_fields']
      });
    }

    let result;

    switch (action) {
      case 'create':
        const validation = validateLeadData(params);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            errors: validation.errors
          });
        }
        result = await createLead(params);
        break;

      case 'get':
        if (!params.lead_id) {
          return res.status(400).json({
            success: false,
            error: 'lead_id parameter is required'
          });
        }
        result = await getLeadById(params.lead_id);
        break;

      case 'update':
        if (!params.lead_id) {
          return res.status(400).json({
            success: false,
            error: 'lead_id parameter is required'
          });
        }
        result = await updateLeadStatus(params.lead_id, params);
        break;

      case 'list':
        result = await listLeads(params);
        break;

      case 'debug_fields':
        result = await debugAirtableFields();
        break;

      case 'test':
        result = await testConnection();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
          available_actions: ['create', 'get', 'update', 'list', 'test', 'debug_fields']
        });
    }

    console.log(`✅ Action '${action}' completed:`, result.success ? 'SUCCESS' : 'ERROR');

    return res.status(result.success ? 200 : 500).json({
      ...result,
      timestamp: new Date().toISOString(),
      eva_version: '16.0',
      action_executed: action
    });

  } catch (error) {
    console.error('❌ Airtable Leads API error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error in Airtable Leads API',
      timestamp: new Date().toISOString()
    });
  }
};
