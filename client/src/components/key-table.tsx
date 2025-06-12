import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Ban, Undo, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscordKey {
  id: number;
  keyId: string;
  userId?: string;
  discordUsername?: string;
  hwid?: string;
  status: string;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: string;
}

interface KeyTableProps {
  keys: DiscordKey[];
  onViewKey?: (keyId: string) => void;
  onRevokeKey?: (keyId: string) => void;
  onRestoreKey?: (keyId: string) => void;
  onFilterChange?: (filter: string) => void;
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
};

export default function KeyTable({
  keys,
  onViewKey,
  onRevokeKey,
  onRestoreKey,
  onFilterChange,
}: KeyTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const itemsPerPage = 5;

  const filteredKeys = keys.filter(key => 
    statusFilter === "all" || key.status === statusFilter
  );

  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedKeys = filteredKeys.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    onFilterChange?.(value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatKeyId = (keyId: string) => {
    if (keyId.length <= 24) return keyId;
    return `${keyId.substring(0, 12)}...${keyId.substring(keyId.length - 8)}`;
  };

  return (
    <Card className="mt-8 border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="text-xl mr-2">🔑</span>
            Discord Keys
          </CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-discord-primary hover:bg-discord-secondary text-white">
              Manage Keys
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {paginatedKeys.length === 0 ? (
            <div className="px-8 py-16 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">🔑</span>
                </div>
                <p className="text-xl font-medium text-gray-900 mb-2">No keys found</p>
                <p className="text-gray-500 max-w-sm">
                  {statusFilter === "all" 
                    ? "Generate your first Discord key to get started with bot access management"
                    : `No ${statusFilter} keys found. Try adjusting your filter settings.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedKeys.map((key) => (
                <div key={key.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Key Information */}
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-lg">🔑</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-sm font-medium text-gray-900">Key ID</h3>
                            <Badge
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                statusColors[key.status as keyof typeof statusColors] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {key.status.charAt(0).toUpperCase() + key.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-gray-100 px-3 py-1.5 rounded-md font-mono text-gray-800 border">
                              {formatKeyId(key.keyId)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.keyId)}
                              className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                              title="Copy full key ID"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* User Information */}
                      <div className="flex items-center space-x-4 pl-16">
                        {key.discordUsername ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-discord-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-discord-primary">
                                {key.discordUsername[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{key.discordUsername}</p>
                              {key.userId && (
                                <p className="text-xs text-gray-500">ID: {key.userId}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-amber-600">?</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-amber-700">Unlinked Key</p>
                              <p className="text-xs text-amber-600">Not connected to a Discord user</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Additional Information */}
                      <div className="flex items-center justify-between pl-16">
                        <div className="flex items-center space-x-6 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Created:</span>{" "}
                            {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                          </div>
                          {key.hwid && (
                            <div>
                              <span className="font-medium">HWID:</span>{" "}
                              <code className="font-mono">{key.hwid.substring(0, 16)}...</code>
                            </div>
                          )}
                          {key.revokedAt && (
                            <div className="text-red-600">
                              <span className="font-medium">Revoked:</span>{" "}
                              {formatDistanceToNow(new Date(key.revokedAt), { addSuffix: true })}
                              {key.revokedBy && ` by ${key.revokedBy}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewKey?.(key.keyId)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="View Key Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {key.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevokeKey?.(key.keyId)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Revoke Key"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestoreKey?.(key.keyId)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          title="Restore Key"
                        >
                          <Undo className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, filteredKeys.length)}
                </span>{" "}
                of <span className="font-medium">{filteredKeys.length}</span> results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="hover:bg-gray-100"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}