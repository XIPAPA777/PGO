
import { NextResponse } from 'next/server';
import { LarkClient } from '@/lib/lark';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { larkAppId, larkAppSecret, larkBaseToken } = body;

    if (!larkAppId || !larkAppSecret || !larkBaseToken) {
      return NextResponse.json({ success: false, message: 'Missing credentials' }, { status: 400 });
    }

    const client = new LarkClient({
      appId: larkAppId,
      appSecret: larkAppSecret,
    });

    // 1. Test Auth
    const isValid = await client.validateConnection();
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid App ID or Secret' }, { status: 401 });
    }

    // 2. Test Base Access & List Tables
    // https://open.feishu.cn/open-apis/bitable/v1/apps/:app_token/tables
    let tables: any[] = [];
    try {
        const res = await client.request(`/bitable/v1/apps/${larkBaseToken}/tables`);
        tables = res.items || [];
    } catch (e: any) {
        // 针对常见错误码给出友好提示
        if (e.message?.includes('91403') || e.message?.includes('Forbidden')) {
            return NextResponse.json({
                success: false,
                message: '应用无权访问此多维表格。请打开多维表格 → 点击右上角「...」→「添加协作者」→ 搜索并添加您的应用名称（权限选"可编辑"）'
            }, { status: 403 });
        }
        return NextResponse.json({ success: false, message: `Failed to access Base: ${e.message}` }, { status: 400 });
    }

    // 3. Check/Create Tables
    const requiredTables = ['Backlog', 'DailyTasks', 'DailyInsights'];
    const tableMap: Record<string, string> = {};
    const createdTables: string[] = [];

    for (const tableName of requiredTables) {
        const existing = tables.find((t: any) => t.name === tableName);
        if (existing) {
            tableMap[tableName.toLowerCase()] = existing.table_id;
            createdTables.push(`${tableName} (Found)`);
        } else {
            // Create Table
            try {
                // Feishu API: POST /tables creates a table
                // Body: { table: { name: "Tasks" } }
                const res = await client.request(`/bitable/v1/apps/${larkBaseToken}/tables`, 'POST', {
                    table: { name: tableName }
                });
                
                const tableId = res.table_id;
                tableMap[tableName.toLowerCase()] = tableId;
                createdTables.push(`${tableName} (Created)`);
                
                // Add default fields for Backlog (Sheet 1)
                if (tableName === 'Backlog') {
                    // TaskID, AddedDate, Content, Category, TargetDate, Status, UserID
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'UserID' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'TaskID' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Date', field_name: 'AddedDate' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'Content' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'Category' }); // Changed to Text
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'TargetDate' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'Status' });
                }

                // Add default fields for DailyTasks (Sheet 2)
                if (tableName === 'DailyTasks') {
                    // Date, TaskContent, Category, PlannedTime, IsCompleted, ActualTimeRange, ActualDuration, IsUnplanned, UserID
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'UserID' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Date', field_name: 'Date' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'TaskContent' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'Category' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'PlannedTime' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'IsCompleted' }); // Changed to Text
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'ActualTimeRange' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Number', field_name: 'ActualDuration' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'IsUnplanned' });
                }

                // Add default fields for DailyInsights (Sheet 3)
                if (tableName === 'DailyInsights') {
                    // Date, Insight, Score, UserID
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'UserID' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Date', field_name: 'Date' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Text', field_name: 'Insight' });
                    await client.request(`/bitable/v1/apps/${larkBaseToken}/tables/${tableId}/fields`, 'POST', { ui_type: 'Number', field_name: 'Score' });
                }

            } catch (e: any) {
                createdTables.push(`${tableName} (Failed: ${e.message})`);
            }
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: 'Connection successful',
        tables: createdTables,
        tableMap
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
