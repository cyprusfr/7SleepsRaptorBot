import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Lock, File, Folder, Save, Eye, Edit3, Code, Shield, Github, GitCommit, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  sha?: string;
  children?: FileNode[];
}

interface FileData {
  content: string;
  path: string;
  sha?: string;
  source?: string;
  lastModified?: string;
}

export default function CodeManager() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [githubIntegration, setGithubIntegration] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [currentSha, setCurrentSha] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const authenticate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/owner/authenticate?password=${encodeURIComponent(password)}`);
      const data = await response.json();
      
      if (data.authenticated) {
        setAuthenticated(true);
        loadFiles();
        toast({
          title: "Authentication Successful",
          description: "Owner access granted. Loading project files...",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid owner password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to authenticate.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/owner/files?password=${encodeURIComponent(password)}`);
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load files.",
        variant: "destructive",
      });
    }
  };

  const loadFile = async (filePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/owner/file/${encodeURIComponent(filePath)}?password=${encodeURIComponent(password)}`);
      const data = await response.json();
      setFileContent(data.content || '');
      setSelectedFile(filePath);
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load file.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/owner/file/${encodeURIComponent(selectedFile)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          content: fileContent
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        toast({
          title: "File Saved",
          description: `Successfully updated ${selectedFile}`,
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save file.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ marginLeft: depth * 20 }}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent ${
            selectedFile === node.path ? 'bg-accent' : ''
          }`}
          onClick={() => node.type === 'file' && loadFile(node.path)}
        >
          {node.type === 'directory' ? (
            <Folder className="h-4 w-4 text-blue-500" />
          ) : (
            <File className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm">{node.name}</span>
          {node.size && (
            <Badge variant="outline" className="ml-auto text-xs">
              {(node.size / 1024).toFixed(1)}KB
            </Badge>
          )}
        </div>
        {node.children && renderFileTree(node.children, depth + 1)}
      </div>
    ));
  };

  if (!authenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5" />
              Owner Access Required
            </CardTitle>
            <CardDescription>
              Enter the owner password to access code management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Owner password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>
            <Button 
              onClick={authenticate} 
              disabled={loading || !password}
              className="w-full"
            >
              <Lock className="mr-2 h-4 w-4" />
              {loading ? "Authenticating..." : "Access Code Manager"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Code Manager</h1>
        <p className="text-muted-foreground">Owner-only access to view and edit project files</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Project Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {renderFileTree(files)}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* File Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {selectedFile || 'No file selected'}
            </CardTitle>
            {selectedFile && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                  {isEditing ? 'View' : 'Edit'}
                </Button>
                {isEditing && (
                  <Button size="sm" onClick={saveFile} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedFile ? (
              <div className="space-y-4">
                <Textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  readOnly={!isEditing}
                  className="min-h-96 font-mono text-sm"
                  placeholder="Select a file to view its content"
                />
                {!isEditing && (
                  <p className="text-sm text-muted-foreground">
                    Click "Edit" to modify this file
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a file from the tree to view its content</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Access Files</CardTitle>
          <CardDescription>
            Commonly edited files for bot management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              'server/discord-bot.ts',
              'server/routes.ts', 
              'server/storage.ts',
              'shared/schema.ts',
              'client/src/App.tsx',
              'server/whitelist-api.ts',
              'package.json',
              'replit.md'
            ].map((filePath) => (
              <Button
                key={filePath}
                variant="outline"
                size="sm"
                onClick={() => loadFile(filePath)}
                className="justify-start text-left"
              >
                <File className="h-4 w-4 mr-2" />
                {filePath.split('/').pop()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}