"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bookmark, PenLine, Loader2, FileText } from "lucide-react";

interface TopicItem {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  _count: { contentItems: number };
  createdAt: string;
}

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.topics || []);
    } catch {
      setTopics([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreateFromTopic = (topic: TopicItem) => {
    const params = new URLSearchParams({
      action: "create",
      topic: topic.name,
      topicId: topic.id,
    });
    router.push(`/chat?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选题库</h1>
          <p className="text-gray-500 text-sm mt-1">
            管理选题，从选题创建内容（热点页可「加入选题库」）
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : topics.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <div className="flex justify-center mb-4">
            <Bookmark className="h-12 w-12 text-gray-200" />
          </div>
          <p className="text-gray-500 mb-2">暂无选题</p>
          <p className="text-sm text-gray-400 mb-4">
            在「热点追踪」页点击热点旁的「加入选题库」即可将热点保存为选题
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => router.push("/trends")}
          >
            去热点追踪
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md hover:shadow-gray-100/80 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Bookmark className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{topic.name}</p>
                {topic.description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {topic.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <FileText className="h-3.5 w-3.5" />
                    {topic._count.contentItems} 条内容
                  </span>
                  {topic.tags?.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {topic.tags.slice(0, 3).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateFromTopic(topic)}
                className="gap-1.5 shrink-0 rounded-xl"
              >
                <PenLine className="h-3.5 w-3.5" />
                从该选题创作
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
