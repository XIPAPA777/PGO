
import { NextResponse } from 'next/server';
import { LarkClient } from '@/lib/lark';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table, recordId, data, config } = body;
    // config: { larkAppId, larkAppSecret, larkBaseToken, larkTableMap }
    
    // Validate config presence
    if (!config || !config.larkAppId || !config.larkAppSecret || !config.larkBaseToken || !config.larkTableMap) {
      return NextResponse.json({ success: false, message: 'Invalid sync configuration' }, { status: 400 });
    }

    const client = new LarkClient({
      appId: config.larkAppId,
      appSecret: config.larkAppSecret,
    });

    // Determine Table ID
    const tableId = config.larkTableMap[table.toLowerCase()];
    if (!tableId) {
       return NextResponse.json({ success: false, message: `Table ID not found for ${table}` }, { status: 400 });
    }

    const baseRecordUrl = `/bitable/v1/apps/${config.larkBaseToken}/tables/${tableId}/records`;

    let result;

    switch (action) {
      case 'create':
        // POST /records
        // data should be { fields: { ... } }
        result = await client.request(baseRecordUrl, 'POST', {
            fields: data
        });
        break;
      
      case 'update':
        if (!recordId) throw new Error('Record ID required for update');
        // PUT /records/:record_id
        result = await client.request(`${baseRecordUrl}/${recordId}`, 'PUT', {
            fields: data
        });
        break;

      case 'delete':
        if (!recordId) throw new Error('Record ID required for delete');
        // DELETE /records/:record_id
        await client.request(`${baseRecordUrl}/${recordId}`, 'DELETE');
        result = { success: true };
        break;

      case 'list':
        // GET /records?filter=...
        // Filter by UserID if provided in data context
        let query = '';
        if (data?.userId) {
            // Note: Field name is 'UserID'
            // filter=CurrentValue.[UserID]="user_id"
            const filter = `CurrentValue.[UserID]="${data.userId}"`;
            query = `?filter=${encodeURIComponent(filter)}`;
        }
        // Add page_size=500 for MVP
        query += (query ? '&' : '?') + 'page_size=500';
        
        result = await client.request(`${baseRecordUrl}${query}`, 'GET');
        break;

      default:
        return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Lark Data API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
