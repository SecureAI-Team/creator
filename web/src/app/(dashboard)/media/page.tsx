"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  ImageIcon,
  Video,
  Music,
  Trash2,
  Search,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type MediaTypeFilter = "all" | "IMAGE" | "VIDEO" | "AUDIO";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  size: number;
  tags: string[];
  folder: string | null;
  createdAt: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

const typeTabs: { key: MediaTypeFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "IMAGE", label: "图片" },
  { key: "VIDEO", label: "视频" },
  { key: "AUDIO", label: "音频" },
];

const typeConfig = {
  IMAGE: { icon: ImageIcon, bg: "bg-pink-50", color: "text-pink-600" },
  VIDEO: { icon: Video, bg: "bg-violet-50", color: "text-violet-600" },
  AUDIO: { icon: Music, bg: "bg-amber-50", color: "text-amber-600" },
};

export default function MediaPage() {
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("q", search);
      if (folderFilter) params.set("folder", folderFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [typeFilter, search, folderFilter, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, search, folderFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId || !confirm("确定要删除此素材吗？")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        if (selectedItem?.id === id) setSelectedItem(null);
        fetchItems();
      }
    } catch {
      // ignore
    }
    setDeletingId(null);
  };

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (uploadTags.trim()) formData.append("tags", uploadTags.trim());
    if (uploadFolder.trim()) formData.append("folder", uploadFolder.trim());

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      } else {
        setUploadProgress(50);
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      setUploadProgress(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        setShowUpload(false);
        setUploadTags("");
        setUploadFolder("");
        fetchItems();
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setUploadProgress(0);
    });

    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const folders = [...new Set(items.map((i) => i.folder).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">素材库</h1>
          <p className="text-gray-500 text-sm mt-1">
            管理你的图片、视频、音频素材 {total > 0 && `(${total} 个)`}
          </p>
        </div>
        <Button
          className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="h-4 w-4" />
          上传
        </Button>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex rounded-xl bg-gray-100 p-1">
            {typeTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                  typeFilter === tab.key
                    ? "bg-white shadow-sm font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索文件名或标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[140px]">
            <FolderOpen className="h-4 w-4 text-gray-400 shrink-0" />
            {folders.length > 0 ? (
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex-1"
              >
                <option value="">全部文件夹</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="按文件夹筛选"
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="rounded-xl border-gray-200 flex-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* Grid view */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => {
              const tc = typeConfig[item.type];
              const Icon = tc.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group relative rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg hover:shadow-gray-100/80 transition-all cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    {item.type === "IMAGE" ? (
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${tc.bg}`}
                      >
                        <Icon className={`h-12 w-12 ${tc.color}`} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {item.filename}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatSize(item.size)}
                      {item.tags.length > 0 && (
                        <span className="ml-1">
                          · {item.tags.slice(0, 2).join(", ")}
                          {item.tags.length > 2 && "..."}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-200"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="font-medium text-gray-600 mb-1">暂无素材</h3>
          <p className="text-sm text-gray-400 mb-4">
            点击「上传」添加你的第一份素材
          </p>
          <Button
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            上传素材
          </Button>
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="aspect-video bg-gray-100 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                {selectedItem.type === "IMAGE" ? (
                  <img
                    src={selectedItem.url}
                    alt={selectedItem.filename}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      typeConfig[selectedItem.type].bg
                    }`}
                  >
                    {(() => {
                      const DetailIcon = typeConfig[selectedItem.type].icon;
                      return (
                        <DetailIcon
                          className={`h-16 w-16 ${typeConfig[selectedItem.type].color}`}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">文件名</span>
                  <p className="font-medium text-gray-900 truncate">
                    {selectedItem.filename}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-400">大小</span>
                    <p className="font-medium text-gray-900">
                      {formatSize(selectedItem.size)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">类型</span>
                    <p className="font-medium text-gray-900">
                      {typeTabs.find((t) => t.key === selectedItem.type)
                        ?.label || selectedItem.type}
                    </p>
                  </div>
                </div>
                {selectedItem.folder && (
                  <div>
                    <span className="text-gray-400">文件夹</span>
                    <p className="font-medium text-gray-900">
                      {selectedItem.folder}
                    </p>
                  </div>
                )}
                {selectedItem.tags.length > 0 && (
                  <div>
                    <span className="text-gray-400">标签</span>
                    <p className="font-medium text-gray-900">
                      {selectedItem.tags.join(", ")}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">URL</span>
                  <p className="font-mono text-xs text-gray-600 break-all">
                    {selectedItem.url}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">上传素材</h3>
              <button
                onClick={() => !uploading && setShowUpload(false)}
                disabled={uploading}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? "border-blue-400 bg-blue-50/50"
                    : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
                } ${uploading ? "pointer-events-none opacity-70" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                {uploading ? (
                  <div className="space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm font-medium text-gray-700">上传中...</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      拖拽文件到此处，或点击选择
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      支持图片、视频、音频
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  标签（可选，逗号分隔）
                </label>
                <Input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="例如: 封面, 产品图"
                  className="rounded-xl border-gray-200"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  文件夹（可选）
                </label>
                <Input
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="例如: 产品图"
                  className="rounded-xl border-gray-200"
                  disabled={uploading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
