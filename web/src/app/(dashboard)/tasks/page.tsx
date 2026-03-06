"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ListChecks, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Play,
  AlertTriangle,
} from "lucide-react";

const TASK_TYPES: Record<string, string> = {
  publish: "发布",
  data_refresh: "数据采集",
  content_generate: "内容生成",
  adapt: "平台适配",
  comment_collect: "评论采集",
  trend_collect: "热点采集",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "等待中", color: "bg-gray-100 text-gray-600", icon: Clock },
  running: { label: "执行中", color: "bg-blue-100 text-blue-700", icon: Play },
  completed: { label: "已完成", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  failed: { label: "失败", color: "bg-red-100 text-red-700", icon: XCircle },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-500", icon: AlertTriangle },
};

interface TaskItem {
  id: string;
  taskType: string;
  status: string;
  platform: string | null;
  error: string | null;
  duration: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [todayStats, setTodayStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("taskType", typeFilter);

    try {
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
      setTodayStats(data.todayStats || {});
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const totalToday = Object.values(todayStats).reduce((s, v) => s + v, 0);
  const completedToday = todayStats.completed || 0;
  const failedToday = todayStats.failed || 0;
  const runningNow = todayStats.running || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务中心</h1>
          <p className="text-gray-500 text-sm mt-1">查看所有自动化任务的执行记录和状态</p>
        </div>
        <button
          onClick={fetchTasks}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm text-white shadow-sm hover:from-blue-600 hover:to-indigo-600"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "今日任务", value: totalToday, color: "text-gray-900" },
          { label: "已完成", value: completedToday, color: "text-green-600" },
          { label: "执行中", value: runningNow, color: "text-blue-600" },
          { label: "失败", value: failedToday, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="all">全部状态</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          <option value="all">全部类型</option>
          {Object.entries(TASK_TYPES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <ListChecks className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">暂无任务记录</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
          {tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={task.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Icon className="h-5 w-5 shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {TASK_TYPES[task.taskType] || task.taskType}
                      </span>
                      {task.platform && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {task.platform}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{new Date(task.createdAt).toLocaleString("zh-CN")}</span>
                      {task.duration != null && (
                        <span>耗时 {(task.duration / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                    {task.error && (
                      <p className="text-xs text-red-500 mt-1 truncate">{task.error}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
