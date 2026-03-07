
import { NextResponse } from 'next/server';
import { LarkClient } from '@/lib/lark';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, backlogItems, dailyTasks, dailyInsight } = body;
    // backlogItems: Array of TodoItem (Sheet 1)
    // dailyTasks: Array of DailyTaskRecord (Sheet 2)
    // dailyInsight: { date, insight, score } (Sheet 3)

    if (!config?.larkAppId || !config?.larkAppSecret || !config?.larkBaseToken || !config?.larkTableMap) {
      return NextResponse.json({ success: false, message: 'Missing config' }, { status: 400 });
    }

    const client = new LarkClient({
      appId: config.larkAppId,
      appSecret: config.larkAppSecret,
    });

    const backlogTableId = config.larkTableMap['backlog'];
    const dailyTableId = config.larkTableMap['dailytasks'];
    // Optional for now until user re-configs
    const insightTableId = config.larkTableMap['dailyinsights'];

    if (!backlogTableId || !dailyTableId) {
         return NextResponse.json({ success: false, message: 'Table IDs not found in config' }, { status: 400 });
    }

    // 1. Sync Backlog (Full Sync or Upsert?)
    // Strategy: Since we want to reflect "Current Status", we should ideally upsert.
    // However, finding existing records is expensive without storing record_id.
    // V1.1 Simplified Strategy: 
    // We treat this as "Dump Snapshot" or "Log".
    // Wait, the user said "Sheet 1: Backlog, used to record current task list".
    // If we just append every day, it becomes a log, not a current list.
    // Ideally we should clear and rewrite? Or search by TaskID?
    // Given MVP constraints, let's try to SEARCH by TaskID first.
    // Since batch sync is manual and infrequent (once a day), performance is less critical.
    
    // BUT, iterating 100 backlog items and searching each is too slow.
    // Optimization: Read ALL records from Backlog Table first, build a map of TaskID -> RecordID.
    
    // Step 1.1: Fetch existing backlog records
    const existingBacklog = await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${backlogTableId}/records?page_size=500`, 'GET');
    const existingMap = new Map<string, string>(); // TaskID -> RecordID
    if (existingBacklog.items) {
        existingBacklog.items.forEach((record: any) => {
            if (record.fields.TaskID) {
                existingMap.set(record.fields.TaskID, record.record_id);
            }
        });
    }

    // Step 1.2: Upsert Backlog Items
    for (const item of backlogItems) {
        const recordId = existingMap.get(item.id);
        const fields = {
            UserID: item.userId,
            TaskID: item.id,
            AddedDate: item.createdAt, // Send timestamp (number)
            Content: item.title,
            Category: item.category,
            TargetDate: item.targetDate || '',
            Status: item.status
        };

        if (recordId) {
            // Update
            await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${backlogTableId}/records/${recordId}`, 'PUT', { fields });
        } else {
            // Create
            await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${backlogTableId}/records`, 'POST', { fields });
        }
    }

    // 2. Sync Daily Tasks (Snapshot Strategy)
    // To solve "deleted items" issue, we will clear today's records for this user and rewrite them.
    if (dailyTasks && dailyTasks.length > 0) {
        // We assume all dailyTasks have the same date (midnight timestamp).
        const targetDate = dailyTasks[0].date; 
        const userId = dailyTasks[0].userId;

        // Step 2.1: Find existing records for TODAY + USERID
        // Note: Lark filter syntax for Number/Date: CurrentValue.[Date] = ...
        // We MUST encode the filter string properly to handle spaces/quotes/special chars
        try {
            const filterString = `CurrentValue.[Date]=${targetDate}&&CurrentValue.[UserID]="${userId}"`;
            const encodedFilter = encodeURIComponent(filterString);
            
            const listRes = await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${dailyTableId}/records?filter=${encodedFilter}`, 'GET');
            
            if (listRes.data && listRes.data.items) {
                const existingRecordIds = listRes.data.items.map((item: any) => item.record_id);
                
                // Step 2.2: Delete them in batch (if any)
                if (existingRecordIds.length > 0) {
                     // Lark doesn't support batch delete easily in one call for V1? 
                     // V1 supports batch_delete endpoint: /bitable/v1/apps/:app_token/tables/:table_id/records/batch_delete
                     await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${dailyTableId}/records/batch_delete`, 'POST', {
                        records: existingRecordIds
                     });
                }
            }
        } catch (e) {
            console.warn('Failed to clean up old daily records, falling back to append', e);
        }
        
        // Step 2.3: Insert new records
        // Use batch_create for efficiency? Yes.
        const recordsToCreate = dailyTasks.map((task: any) => ({
            fields: {
                UserID: task.userId,
                Date: task.date,
                TaskContent: task.content,
                Category: task.category,
                PlannedTime: task.plannedTime || '',
                IsCompleted: task.isCompleted ? '是' : '否',
                ActualTimeRange: task.actualTimeRange || '',
                ActualDuration: task.actualDuration || 0,
                IsUnplanned: task.isUnplanned ? '临时新增' : '计划内'
            }
        }));

        // Batch Create (Limit 100 per call, assume we don't exceed for daily tasks)
        if (recordsToCreate.length > 0) {
             await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${dailyTableId}/records/batch_create`, 'POST', {
                records: recordsToCreate
             });
        }
    }

    // 3. Sync Daily Insight (Append Only)
    if (dailyInsight && insightTableId) {
        // Optional: Check if already exists for today? For MVP just append.
        await client.request(`/bitable/v1/apps/${config.larkBaseToken}/tables/${insightTableId}/records`, 'POST', {
            fields: {
                UserID: dailyInsight.userId,
                Date: dailyInsight.date,
                Insight: dailyInsight.insight,
                Score: dailyInsight.score
            }
        });
    }

    return NextResponse.json({ success: true, message: 'Batch sync completed' });

  } catch (error: any) {
    console.error('Batch Sync Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
