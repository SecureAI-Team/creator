"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Video, Image, Music, Settings2, ExternalLink, Loader2, Sparkles,
  Clock, Plus, Trash2, Play, Pause, RefreshCw,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  category: string;
  url: string;
  description?: string;
  enabled: boolean;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  message: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

type Category = {
  key: string;
  label: string;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
};

const categories: Category[] = [
  { key: "text", label: "文本生成", icon: FileText, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
  { key: "video", label: "视频生成", icon: Video, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
  { key: "image", label: "图片生成", icon: Image, iconBg: "bg-pink-50", iconColor: "text-pink-600" },
  { key: "audio", label: "音频/TTS", icon: Music, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  { key: "other", label: "综合工具", icon: Settings2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
];

const CRON_TEMPLATES = [
  { name: "每日数据刷新", schedule: "0 9 * * *", message: "/data refresh all", desc: "每天上午 9 点自动刷新所有平台数据" },
  { name: "登录状态保活", schedule: "0 */6 * * *", message: "/status all", desc: "每 6 小时检查一次登录状态" },
  { name: "每周数据报告", schedule: "0 10 * * 1", message: "/data refresh all", desc: "每周一上午 10 点刷新数据" },
];

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Cron state
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [cronLoading, setCronLoading] = useState(true);
  const [showCronForm, setShowCronForm] = useState(false);
  const [cronForm, setCronForm] = useState({ name: "", schedule: "", message: "" });
  const [cronSaving, setCronSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"tools" | "cron">("tools");

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((d) => setTools(d.tools || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/cron")
      .then((r) => r.json())
      .then((d) => setCronJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setCronLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const tool = tools.find((t) => t.id === id);
      if (!tool) return;
      const res = await fetch("/api/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !tool.enabled }),
      });
      const updated = await res.json();
      setTools((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, enabled: updated.tool?.enabled ?? !t.enabled } : t
        )
      );
    } catch { /* ignore */ }
    setToggling(null);
  };

  const handleCronToggle = async (job: CronJob) => {
    try {
      const res = await fetch("/api/cron", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, enabled: !job.enabled }),
      });
      const data = await res.json();
      setCronJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, ...data.job } : j))
      );
    } catch {}
  };

  const handleCronCreate = async () => {
    if (!cronForm.name || !cronForm.schedule || !cronForm.message) return;
    setCronSaving(true);
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cronForm),
      });
      const data = await res.json();
      if (data.job) {
        setCronJobs((prev) => [data.job, ...prev]);
        setCronForm({ name: "", schedule: "", message: "" });
        setShowCronForm(false);
      }
    } catch {}
    setCronSaving(false);
  };

  const handleCronDelete = async (id: string) => {
    try {
      await fetch("/api/cron", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setCronJobs((prev) => prev.filter((j) => j.id !== id));
    } catch {}
  };

  const applyTemplate = (tpl: typeof CRON_TEMPLATES[0]) => {
    setCronForm({ name: tpl.name, schedule: tpl.schedule, message: tpl.message });
    setShowCronForm(true);
  };

  const getCategoryTools = (category: string) =>
    tools.filter((t) => t.category === category);

  if (loading && cronLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工具与自动化</h1>
          <p className="text-gray-500 text-sm mt-1">
            管理 AI 工具和定时自动化任务
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            activeTab === "tools"
              ? "bg-white shadow-sm font-medium text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="h-4 w-4 inline mr-1.5" />
          AI 工具
        </button>
        <button
          onClick={() => setActiveTab("cron")}
          className={`px-4 py-2 text-sm rounded-lg transition-all ${
            activeTab === "cron"
              ? "bg-white shadow-sm font-medium text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          定时任务
          {cronJobs.filter((j) => j.enabled).length > 0 && (
            <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
              {cronJobs.filter((j) => j.enabled).length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "tools" ? (
        <>
          {categories.map((cat) => {
            const catTools = getCategoryTools(cat.key);
            if (catTools.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cat.iconBg}`}>
                    <cat.icon className={`h-4 w-4 ${cat.iconColor}`} />
                  </div>
                  <h2 className="font-semibold text-gray-900">{cat.label}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {catTools.length} 个工具
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catTools.map((tool) => (
                    <div
                      key={tool.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        tool.enabled
                          ? "border-blue-200 bg-blue-50/30"
                          : "border-gray-100 bg-white"
                      } hover:shadow-md hover:shadow-gray-100/80`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-bold shadow-sm">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{tool.name}</div>
                            {tool.url && (
                              <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-0.5"
                              >
                                访问 <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggle(tool.id)}
                          disabled={toggling === tool.id}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            tool.enabled ? "bg-blue-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 left-0.5"
                            style={{ transform: tool.enabled ? "translateX(20px)" : "translateX(0px)" }}
                          />
                        </button>
                      </div>
                      {tool.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tool.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {tools.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                <Settings2 className="h-7 w-7 text-gray-300" />
              </div>
              <h3 className="font-medium text-gray-600 mb-1">暂无工具</h3>
              <p className="text-sm text-gray-400">请联系管理员添加 AI 工具配置</p>
            </div>
          )}
        </>
      ) : (
        /* Cron Jobs Tab */
        <div className="space-y-6">
          {/* Templates */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">快速创建</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CRON_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => applyTemplate(tpl)}
                  className="rounded-2xl border border-gray-100 bg-white p-4 text-left hover:shadow-md hover:shadow-gray-100/80 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm text-gray-900">{tpl.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{tpl.desc}</p>
                  <p className="text-xs text-gray-300 mt-1 font-mono">{tpl.schedule}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Create form */}
          {showCronForm && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">新建定时任务</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">任务名称</label>
                  <Input
                    value={cronForm.name}
                    onChange={(e) => setCronForm((f) => ({ ...f, name: e.target.value }))}
                    className="rounded-xl border-gray-200"
                    placeholder="例：每日数据刷新"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Cron 表达式</label>
                  <Input
                    value={cronForm.schedule}
                    onChange={(e) => setCronForm((f) => ({ ...f, schedule: e.target.value }))}
                    className="rounded-xl border-gray-200 font-mono"
                    placeholder="0 9 * * *"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">执行命令</label>
                  <Input
                    value={cronForm.message}
                    onChange={(e) => setCronForm((f) => ({ ...f, message: e.target.value }))}
                    className="rounded-xl border-gray-200 font-mono"
                    placeholder="/data refresh all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowCronForm(false)}>
                  取消
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  onClick={handleCronCreate}
                  disabled={cronSaving || !cronForm.name || !cronForm.schedule || !cronForm.message}
                >
                  {cronSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  创建
                </Button>
              </div>
            </div>
          )}

          {!showCronForm && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200"
              onClick={() => setShowCronForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> 自定义新任务
            </Button>
          )}

          {/* Jobs list */}
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">已创建的任务</h3>
            </div>
            {cronLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            ) : cronJobs.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {cronJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-4 px-6 py-4">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      job.enabled ? "bg-emerald-50" : "bg-gray-100"
                    }`}>
                      {job.enabled ? (
                        <Play className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Pause className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{job.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                        <span className="font-mono">{job.schedule}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-mono truncate max-w-[200px]">{job.message}</span>
                      </div>
                      {job.lastRun && (
                        <div className="text-xs text-gray-300 mt-0.5">
                          上次运行: {new Date(job.lastRun).toLocaleString("zh-CN")}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCronToggle(job)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        job.enabled ? "bg-emerald-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 left-0.5"
                        style={{ transform: job.enabled ? "translateX(20px)" : "translateX(0px)" }}
                      />
                    </button>
                    <button
                      onClick={() => handleCronDelete(job.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">暂无定时任务</p>
                <p className="text-xs text-gray-300 mt-1">点击上方"快速创建"或"自定义新任务"来添加</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
