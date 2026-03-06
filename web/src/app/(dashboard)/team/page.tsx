"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Shield,
  UserPlus,
  Crown,
  PenLine,
  LogIn,
} from "lucide-react";

type TeamRole = "OWNER" | "ADMIN" | "EDITOR" | "MEMBER";

interface Team {
  id: string;
  name: string;
  role?: TeamRole;
  memberCount?: number;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  role: TeamRole;
}

const roleConfig: Record<
  TeamRole,
  { label: string; bg: string; text: string; icon?: typeof Crown }
> = {
  OWNER: { label: "创建者", bg: "bg-purple-100", text: "text-purple-700", icon: Crown },
  ADMIN: { label: "管理员", bg: "bg-blue-100", text: "text-blue-700", icon: Shield },
  EDITOR: { label: "编辑", bg: "bg-emerald-100", text: "text-emerald-700" },
  MEMBER: { label: "成员", bg: "bg-gray-100", text: "text-gray-600" },
};

const ROLE_OPTIONS: TeamRole[] = ["ADMIN", "EDITOR", "MEMBER"];

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams || []);
      if (selectedTeam && data.teams?.length) {
        const updated = data.teams.find((t: Team) => t.id === selectedTeam.id);
        if (updated)
          setSelectedTeam((prev) =>
            prev ? { ...prev, ...updated, members: prev.members ?? updated.members } : updated
          );
      } else if (!data.teams?.length) {
        setSelectedTeam(null);
      }
    } catch {
      setTeams([]);
    }
    setLoading(false);
  }, [selectedTeam?.id]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeamDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      const data = await res.json();
      if (data.team) setSelectedTeam(data.team);
    } catch {
      // ignore
    }
  }, []);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewTeamName("");
        setShowCreateForm(false);
        await fetchTeams();
        if (data.team?.id) fetchTeamDetail(data.team.id);
      }
    } catch {
      // ignore
    }
    setCreateLoading(false);
  };

  const handleUpdateTeamName = async () => {
    if (!selectedTeam || !editNameValue.trim() || editNameValue === selectedTeam.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editNameValue.trim() }),
      });
      if (res.ok) {
        setSelectedTeam((prev) => (prev ? { ...prev, name: editNameValue.trim() } : null));
        setEditingName(false);
        fetchTeams();
      }
    } catch {
      // ignore
    }
    setSavingName(false);
  };

  const handleUpdateMemberRole = async (memberId: string, role: TeamRole) => {
    if (!selectedTeam) return;
    setUpdatingRole(memberId);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      if (res.ok) {
        await fetchTeamDetail(selectedTeam.id);
        fetchTeams();
      }
    } catch {
      // ignore
    }
    setUpdatingRole(null);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !confirm("确定移出该成员？")) return;
    setRemovingMember(memberId);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (res.ok) {
        await fetchTeamDetail(selectedTeam.id);
        fetchTeams();
      }
    } catch {
      // ignore
    }
    setRemovingMember(null);
  };

  const handleGenerateInvite = async () => {
    if (!selectedTeam) return;
    setGeneratingInvite(true);
    try {
      const res = await fetch(`/api/teams/${selectedTeam.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code || data.inviteCode || "");
      }
    } catch {
      // ignore
    }
    setGeneratingInvite(false);
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      if (res.ok) {
        setJoinCode("");
        await fetchTeams();
      }
    } catch {
      // ignore
    }
    setJoinLoading(false);
  };

  const canManage = selectedTeam?.role === "OWNER" || selectedTeam?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">团队协作</h1>
          <p className="text-gray-500 text-sm mt-1">管理你的团队成员与权限</p>
        </div>
          {teams.length === 0 && (
          <Button
            className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-4 w-4" />
            创建团队
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : teams.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
            <Users className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="font-medium text-gray-600 mb-1">暂无团队</h3>
          <p className="text-sm text-gray-400 mb-6">创建或加入团队开始协作</p>
          {showCreateForm ? (
            <div className="max-w-sm mx-auto flex gap-2 justify-center">
              <Input
                placeholder="团队名称"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="rounded-xl border-gray-200"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              />
              <Button
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                onClick={handleCreateTeam}
                disabled={createLoading || !newTeamName.trim()}
              >
                {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "创建"}
              </Button>
            </div>
          ) : (
            <Button
              className="gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4" />
              创建团队
            </Button>
          )}
        </div>
      ) : (
        <>
        {showCreateForm && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">新团队名称</label>
              <Input
                placeholder="输入团队名称"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="rounded-xl border-gray-200"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              />
            </div>
            <Button
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              onClick={handleCreateTeam}
              disabled={createLoading || !newTeamName.trim()}
            >
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "创建"}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-gray-200"
              onClick={() => {
                setShowCreateForm(false);
                setNewTeamName("");
              }}
            >
              取消
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team list */}
          <div className="lg:col-span-1 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-500">我的团队</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + 创建团队
              </button>
            </div>
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => {
                  setSelectedTeam(team);
                  fetchTeamDetail(team.id);
                  setInviteCode("");
                }}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  selectedTeam?.id === team.id
                    ? "border-blue-200 bg-blue-50/50 shadow-sm"
                    : "border-gray-100 bg-white hover:shadow-md hover:shadow-gray-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{team.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          team.role ? roleConfig[team.role].bg + " " + roleConfig[team.role].text : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {team.role && (() => {
                          const Icon = roleConfig[team.role!].icon;
                          return Icon ? <Icon className="h-3 w-3" /> : null;
                        })()}
                        {team.role ? roleConfig[team.role].label : "成员"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {team.memberCount ?? team.members?.length ?? 0} 人
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected team detail */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTeam ? (
              <>
                {/* Team name (editable for OWNER/ADMIN) */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-center gap-3">
                    {editingName && canManage ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="rounded-xl border-gray-200"
                          onKeyDown={(e) =>
                            e.key === "Enter"
                              ? handleUpdateTeamName()
                              : e.key === "Escape" && setEditingName(false)
                          }
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                          onClick={handleUpdateTeamName}
                          disabled={savingName}
                        >
                          {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-gray-200"
                          onClick={() => setEditingName(false)}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-semibold text-gray-900">{selectedTeam.name}</h2>
                        {canManage && (
                          <button
                            onClick={() => {
                              setEditingName(true);
                              setEditNameValue(selectedTeam.name);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <PenLine className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Members list */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h3 className="font-medium text-gray-900 mb-4">成员</h3>
                  <div className="space-y-3">
                    {(selectedTeam.members || []).map((member) => {
                      const rc = roleConfig[member.role];
                      const Icon = rc.icon;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50/50"
                        >
                          <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium text-sm shrink-0">
                            {(member.name || member.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {member.name || member.email || "未知"}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{member.email}</div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${rc.bg} ${rc.text}`}
                          >
                            {Icon && <Icon className="h-3 w-3" />}
                            {rc.label}
                          </span>
                          {canManage && member.role !== "OWNER" && (
                            <div className="flex items-center gap-1">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleUpdateMemberRole(
                                    member.id,
                                    e.target.value as TeamRole
                                  )
                                }
                                disabled={updatingRole === member.id}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 bg-white"
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>
                                    {roleConfig[r].label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingMember === member.id}
                              >
                                {removingMember === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invite section */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-gray-500" />
                    邀请成员
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={inviteCode}
                      placeholder="点击生成邀请链接"
                      className="rounded-xl border-gray-200 bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-gray-200 shrink-0"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                    >
                      {generatingInvite ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "生成邀请链接"
                      )}
                    </Button>
                    {inviteCode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-gray-200 shrink-0 gap-1"
                        onClick={copyInviteCode}
                      >
                        <Copy className="h-4 w-4" />
                        复制
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
                  <Users className="h-7 w-7 text-gray-300" />
                </div>
                <h3 className="font-medium text-gray-600 mb-1">选择团队</h3>
                <p className="text-sm text-gray-400">从左侧选择一个团队查看详情</p>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Join team section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <LogIn className="h-4 w-4 text-gray-500" />
          加入团队
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          使用邀请码加入已有团队
        </p>
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="输入邀请码"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="rounded-xl border-gray-200"
            onKeyDown={(e) => e.key === "Enter" && handleJoinTeam()}
          />
          <Button
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shrink-0"
            onClick={handleJoinTeam}
            disabled={joinLoading || !joinCode.trim()}
          >
            {joinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "加入团队"}
          </Button>
        </div>
      </div>
    </div>
  );
}
