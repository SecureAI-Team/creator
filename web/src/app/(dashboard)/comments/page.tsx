"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const PLATFORMS = [
  { key: "all", label: "全部平台" },
  { key: "bilibili", label: "哔哩哔哩", initial: "B", color: "from-[#00A1D6] to-[#0091c2]" },
  { key: "douyin", label: "抖音", initial: "抖", color: "from-[#1a1a1a] to-[#333333]" },
  { key: "xiaohongshu", label: "小红书", initial: "小", color: "from-[#FE2C55] to-[#e0264c]" },
  { key: "weixin-mp", label: "公众号", initial: "公", color: "from-[#07C160] to-[#06a050]" },
  { key: "weixin-channels", label: "视频号", initial: "视", color: "from-[#07C160] to-[#06a050]" },
  { key: "kuaishou", label: "快手", initial: "快", color: "from-[#FF4906] to-[#e04105]" },
  { key: "zhihu", label: "知乎", initial: "知", color: "from-[#0066FF] to-[#0055dd]" },
];

type TabKey = "all" | "unreplied" | "replied" | "rules";

interface Comment {
  id: string;
  platform: string;
  contentTitle: string | null;
  author: string;
  body: string;
  commentedAt: string;
  replied: boolean;
  replyBody: string | null;
  repliedAt: string | null;
}

interface AutoReplyRule {
  id: string;
  keyword: string;
  reply: string;
  enabled: boolean;
  platform: string | null;
}

export default function CommentsPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [platform, setPlatform] = useState("all");
  const [comments, setComments] = useState<Comment[]>([]);
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleReply, setNewRuleReply] = useState("");
  const [newRulePlatform, setNewRulePlatform] = useState("all");
  const [submittingRule, setSubmittingRule] = useState(false);

  const fetchComments = useCallback(async () => {
    if (tab === "rules") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (platform !== "all") params.set("platform", platform);
      if (tab === "replied") params.set("replied", "true");
      if (tab === "unreplied") params.set("replied", "false");
      const res = await fetch(`/api/comments?${params.toString()}`);
      const data = await res.json();
      setComments(data.comments || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setComments([]);
    }
    setLoading(false);
  }, [tab, platform, page]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await fetch("/api/comments/rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch {
      setRules([]);
    }
    setRulesLoading(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (tab === "rules") fetchRules();
  }, [tab, fetchRules]);

  useEffect(() => {
    setPage(1);
  }, [tab, platform]);

  const handleReply = async (commentId: string) => {
    if (!replyBody.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, replyBody: replyBody.trim() }),
      });
      if (res.ok) {
        setReplyingId(null);
        setReplyBody("");
        await fetchComments();
      }
    } catch {
      // ignore
    }
    setSubmittingReply(false);
  };

  const handleCreateRule = async () => {
    if (!newRuleKeyword.trim() || !newRuleReply.trim()) return;
    setSubmittingRule(true);
    try {
      const res = await fetch("/api/comments/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newRuleKeyword.trim(),
          reply: newRuleReply.trim(),
          platform: newRulePlatform === "all" ? undefined : newRulePlatform,
        }),
      });
      if (res.ok) {
        setNewRuleKeyword("");
        setNewRuleReply("");
        setNewRulePlatform("all");
        setAddingRule(false);
        await fetchRules();
      }
    } catch {
      // ignore
    }
    setSubmittingRule(false);
  };

  const handleToggleRule = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch("/api/comments/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      if (res.ok) await fetchRules();
    } catch {
      // ignore
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("确定删除此规则？")) return;
    try {
      const res = await fetch("/api/comments/rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId }),
      });
      if (res.ok) await fetchRules();
    } catch {
      // ignore
    }
  };

  const getPlatformInfo = (key: string) =>
    PLATFORMS.find((p) => p.key === key) || { key, label: key, initial: "?", color: "from-gray-400 to-gray-500" };

  const tabs = [
    { key: "all" as const, label: "全部评论" },
    { key: "unreplied" as const, label: "未回复" },
    { key: "replied" as const, label: "已回复" },
    { key: "rules" as const, label: "自动回复规则" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">评论管理</h1>
        <p className="text-gray-500 text-sm mt-1">跨平台评论统一管理与自动回复</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                tab === t.key
                  ? "bg-white shadow-sm font-medium text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== "rules" && (
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Comment list (tabs 1–3) */}
      {tab !== "rules" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => {
                const pInfo = getPlatformInfo(c.platform);
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:shadow-gray-100/80 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${pInfo.color} flex items-center justify-center text-white font-bold flex-shrink-0`}
                      >
                        {pInfo.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{c.author}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.commentedAt).toLocaleString("zh-CN")}
                          </span>
                          {c.contentTitle && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px]" title={c.contentTitle}>
                              评论于: {c.contentTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.body}</p>
                        {c.replied && c.replyBody && (
                          <div className="mt-2 pl-3 border-l-2 border-gray-200">
                            <p className="text-xs text-gray-500">我的回复:</p>
                            <p className="text-sm text-gray-600">{c.replyBody}</p>
                          </div>
                        )}
                        {replyingId === c.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              placeholder="输入回复内容..."
                              rows={3}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                onClick={() => handleReply(c.id)}
                                disabled={submittingReply || !replyBody.trim()}
                              >
                                {submittingReply ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                发送
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-gray-200"
                                onClick={() => {
                                  setReplyingId(null);
                                  setReplyBody("");
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          !c.replied && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setReplyingId(c.id);
                                setReplyBody("");
                              }}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              回复
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-gray-200"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages} (共 {total} 条)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-gray-200"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                <MessageSquare className="h-7 w-7 text-gray-300" />
              </div>
              <h3 className="font-medium text-gray-600 mb-1">暂无评论</h3>
              <p className="text-sm text-gray-400">当前筛选条件下没有评论记录</p>
            </div>
          )}
        </>
      )}

      {/* Auto-reply rules (tab 4) */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">关键词匹配后自动回复</p>
            <Button
              className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
              onClick={() => setAddingRule(true)}
              disabled={addingRule}
            >
              <Plus className="h-4 w-4" />
              添加规则
            </Button>
          </div>

          {addingRule && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="关键词"
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
                <Input
                  placeholder="回复内容"
                  value={newRuleReply}
                  onChange={(e) => setNewRuleReply(e.target.value)}
                  className="rounded-xl border-gray-200"
                />
                <select
                  value={newRulePlatform}
                  onChange={(e) => setNewRulePlatform(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">全部平台</option>
                  {PLATFORMS.filter((p) => p.key !== "all").map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={handleCreateRule}
                  disabled={submittingRule || !newRuleKeyword.trim() || !newRuleReply.trim()}
                >
                  {submittingRule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  创建
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-gray-200"
                  onClick={() => {
                    setAddingRule(false);
                    setNewRuleKeyword("");
                    setNewRuleReply("");
                    setNewRulePlatform("all");
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          )}

          {rulesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:shadow-gray-100/80 transition-all flex items-center gap-4"
                >
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    title={rule.enabled ? "禁用" : "启用"}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="h-6 w-6 text-blue-600" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{rule.keyword}</span>
                      <span className="text-xs text-gray-500">
                        → {rule.reply}
                      </span>
                      <span className="text-xs text-gray-400">
                        {rule.platform ? getPlatformInfo(rule.platform).label : "全部平台"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                <MessageSquare className="h-7 w-7 text-gray-300" />
              </div>
              <h3 className="font-medium text-gray-600 mb-1">暂无自动回复规则</h3>
              <p className="text-sm text-gray-400">点击「添加规则」创建关键词自动回复</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
