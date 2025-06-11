import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import KeyTable from "@/components/key-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function KeyManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["/api/keys", statusFilter],
    queryFn: async () => {
      const response = await fetch(`/api/keys?status=${statusFilter}`);
      if (!response.ok) throw new Error("Failed to fetch keys");
      return response.json();
    },
  });

  const filteredKeys = keys.filter((key: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      key.keyId.toLowerCase().includes(query) ||
      key.discordUsername?.toLowerCase().includes(query) ||
      key.hwid?.toLowerCase().includes(query)
    );
  });

  const handleGenerateKey = () => {
    // TODO: Open key generation modal
    console.log("Generate new key");
  };

  const handleExportKeys = () => {
    const link = document.createElement("a");
    link.href = "/api/export?type=keys";
    link.download = `raptor-keys-${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        botStatus={stats?.botStatus || "offline"}
        lastSync={stats?.lastSync ? formatDistanceToNow(new Date(stats.lastSync), { addSuffix: true }) : "Never"}
      />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Key Management</h2>
              <p className="text-gray-600 mt-1">Generate, manage, and monitor Discord keys</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleExportKeys}
                variant="outline"
                className="text-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Keys
              </Button>
              <Button
                onClick={handleGenerateKey}
                className="bg-discord-primary hover:bg-discord-secondary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-gray-900">
                  {keys.length}
                </div>
                <p className="text-gray-600 text-sm">Total Keys</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {keys.filter((k: any) => k.status === "active").length}
                </div>
                <p className="text-gray-600 text-sm">Active Keys</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-red-600">
                  {keys.filter((k: any) => k.status === "revoked").length}
                </div>
                <p className="text-gray-600 text-sm">Revoked Keys</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {keys.filter((k: any) => k.status === "expired").length}
                </div>
                <p className="text-gray-600 text-sm">Expired Keys</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search by key ID, username, or HWID..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Keys Table */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <KeyTable
              keys={filteredKeys}
              onViewKey={(keyId) => console.log("View key:", keyId)}
              onRevokeKey={(keyId) => console.log("Revoke key:", keyId)}
              onRestoreKey={(keyId) => console.log("Restore key:", keyId)}
              onFilterChange={setStatusFilter}
            />
          )}
        </div>
      </main>
    </div>
  );
}
