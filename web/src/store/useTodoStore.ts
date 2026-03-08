import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Category = 'work' | 'growth' | 'life' | 'other';
export type TodoStatus = 'backlog' | 'todo' | 'done';

export interface TodoItem {
  id: string;
  userId: string; // New: Multi-user isolation
  title: string;
  category: Category;
  status: TodoStatus;
  parentId?: string; // 关联蓄水池母任务ID
  plannedTime?: string; // 新增：计划时间段 "14:00-15:00"
  targetDate?: string; // 新增：蓄水池目标日期 "2026-04"
  isUnplanned?: boolean; // 新增：是否为非计划任务
  createdAt: number;
  completedAt?: number;
}

export interface TimeLog {
  id: string;
  userId: string; // New: Multi-user isolation
  taskId: string;
  startTimeStr: string; // "10:00"
  endTimeStr: string;   // "11:00"
  duration: number; // 分钟数
  note?: string;
  createdAt: number;
}

export interface SyncConfig {
  userId: string;
  larkAppId?: string;
  larkAppSecret?: string;
  larkBaseToken?: string;
  larkTableMap?: {
    tasks?: string;
    logs?: string;
  };
  kimiApiKey?: string; // New: Kimi API Key
}

interface TodoState {
  items: TodoItem[];
  timeLogs: TimeLog[];
  isBacklogOpen: boolean;
  syncConfig: SyncConfig; // New

  // Actions
  setSyncConfig: (config: Partial<SyncConfig>) => void; // New
  addItem: (title: string, category: Category, status?: TodoStatus, plannedTime?: string, targetDate?: string, isUnplanned?: boolean, parentId?: string) => string;
  copyToToday: (backlogItem: TodoItem, plannedTime?: string) => void;
  updateItemStatus: (id: string, status: TodoStatus) => void;
  updateItem: (id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => void; // New
  reorderItems: (items: TodoItem[]) => void; // New
  toggleBacklog: () => void;
  deleteItem: (id: string) => void;
  
  // Time Logging Actions
  addTimeLog: (taskId: string, startTimeStr: string, endTimeStr: string, note?: string) => void;
  updateTimeLog: (id: string, updates: Partial<Omit<TimeLog, 'id' | 'taskId' | 'createdAt'>>) => void; // New
  deleteTimeLog: (id: string) => void; // New
  
  // Getters
  getTaskDuration: (taskId: string) => number; // 返回分钟数
  getCurrentUserItems: () => TodoItem[]; // New
  getCurrentUserLogs: () => TimeLog[]; // New
}

// 辅助函数：计算两个时间字符串之间的分钟差
function calculateDuration(start: string, end: string): number {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    return Math.max(0, endMins - startMins);
  } catch (e) {
    return 0;
  }
}

// Sync Helper - REMOVED for V1.1 (Batch Sync Strategy)
// async function syncToLark(...) { ... }

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      items: [],
      timeLogs: [],
      isBacklogOpen: true,
      syncConfig: {
        userId: 'default_user', // Default user
      },

      setSyncConfig: (config) => set((state) => ({ 
        syncConfig: { ...state.syncConfig, ...config } 
      })),

      addItem: (title, category, status = 'backlog', plannedTime, targetDate, isUnplanned, parentId) => {
        const id = crypto.randomUUID();
        const { syncConfig } = get();
        const newItem: TodoItem = {
          id,
          userId: syncConfig.userId,
          title,
          category,
          status,
          plannedTime,
          targetDate,
          isUnplanned,
          parentId,
          createdAt: Date.now(),
        };
        set((state) => ({ items: [...state.items, newItem] }));
        // Sync Removed: V1.1 uses batch sync
        return id;
      },

      copyToToday: (backlogItem, plannedTime) => {
        const { syncConfig } = get();
        const newItem: TodoItem = {
          id: crypto.randomUUID(),
          userId: syncConfig.userId,
          title: backlogItem.title,
          category: backlogItem.category,
          status: 'todo',
          parentId: backlogItem.id,
          plannedTime,
          createdAt: Date.now(),
        };
        set((state) => ({ items: [...state.items, newItem] }));
        // Sync Removed
      },

      updateItemStatus: (id, status) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status, completedAt: status === 'done' ? Date.now() : undefined }
              : item
          ),
        }));
        // Update sync omitted for MVP (requires record lookup)
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        }));
         // Update sync omitted for MVP
      },

      reorderItems: (newItems) => {
        set((state) => {
            const otherItems = state.items.filter(i => !newItems.some(ni => ni.id === i.id));
            return { items: [...otherItems, ...newItems] };
        });
      },

      toggleBacklog: () => set((state) => ({ isBacklogOpen: !state.isBacklogOpen })),

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          timeLogs: state.timeLogs.filter((t) => t.taskId !== id),
        }));
         // Delete sync omitted for MVP
      },

      addTimeLog: (taskId, startTimeStr, endTimeStr, note) => {
        const { syncConfig } = get();
        const duration = calculateDuration(startTimeStr, endTimeStr);
        const createdAt = Date.now();
        // Use local date string for grouping in Feishu (e.g. "2026-03-07")
        const dateStr = new Date(createdAt).toISOString().split('T')[0];
        
        const newLog: TimeLog = {
          id: crypto.randomUUID(),
          userId: syncConfig.userId,
          taskId,
          startTimeStr,
          endTimeStr,
          duration,
          note,
          createdAt,
        };
        set((state) => ({ timeLogs: [...state.timeLogs, newLog] }));
        // Sync Removed
      },

      updateTimeLog: (id, updates) => {
        set((state) => ({
          timeLogs: state.timeLogs.map((log) => {
            if (log.id === id) {
              const updatedLog = { ...log, ...updates };
              // Recalculate duration if time changed
              if (updates.startTimeStr || updates.endTimeStr) {
                updatedLog.duration = calculateDuration(updatedLog.startTimeStr, updatedLog.endTimeStr);
              }
              return updatedLog;
            }
            return log;
          }),
        }));
      },

      deleteTimeLog: (id) => {
        set((state) => ({
          timeLogs: state.timeLogs.filter((log) => log.id !== id),
        }));
      },

      getTaskDuration: (taskId) => {
        const { timeLogs } = get();
        const logs = timeLogs.filter((t) => t.taskId === taskId);
        return logs.reduce((acc, log) => acc + log.duration, 0); // 分钟
      },

      getCurrentUserItems: () => {
        const { items, syncConfig } = get();
        return items.filter(i => i.userId === syncConfig.userId || !i.userId /* compatibility */);
      },

      getCurrentUserLogs: () => {
        const { timeLogs, syncConfig } = get();
        return timeLogs.filter(t => t.userId === syncConfig.userId || !t.userId /* compatibility */);
      },
    }),
    {
      name: 'growth-os-storage',
    }
  )
);
