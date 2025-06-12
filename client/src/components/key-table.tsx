import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Ban, Undo, ChevronLeft, ChevronRight } from "lucide-react";
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
  const itemsPerPage = 10;

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

  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recent Keys
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Information
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🔑</span>
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-2">No keys found</p>
                      <p className="text-sm text-gray-500">Generate your first Discord key to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-6">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">🔑</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              Key ID
                            </div>
                            <div className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-md border">
                              {key.keyId.substring(0, 20)}...
                            </div>
                          </div>
                        </div>
                        {key.hwid && (
                          <div className="text-xs text-gray-500 ml-13">
                            HWID: <span className="font-mono">{key.hwid.substring(0, 16)}...</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-discord-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-discord-primary">
                            {key.discordUsername?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {key.discordUsername || "Unlinked Key"}
                          </div>
                          {key.userId ? (
                            <div className="text-xs text-gray-500">
                              User ID: {key.userId}
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600">
                              Not linked to user
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col space-y-2">
                        <Badge
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full w-fit ${
                            statusColors[key.status as keyof typeof statusColors] ||
                            "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {key.status.charAt(0).toUpperCase() + key.status.slice(1)}
                      </Badge>
                        <div className="text-xs text-gray-500">
                          Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewKey?.(key.keyId)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Key Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {key.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevokeKey?.(key.keyId)}
                            className="text-red-600 hover:text-red-800"
                            title="Revoke Key"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestoreKey?.(key.keyId)}
                            className="text-green-600 hover:text-green-800"
                            title="Restore Key"
                          >
                            <Undo className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewKey?.(key.keyId)}
                          className="text-discord-primary hover:text-discord-secondary"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {key.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevokeKey?.(key.keyId)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestoreKey?.(key.keyId)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Undo className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
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
