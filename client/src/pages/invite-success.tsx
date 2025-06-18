import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowLeft, Bot, Book, Code, Database, Zap, Shield, GamepadIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function InviteSuccess() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const guildName = urlParams.get('guild') || 'Unknown Server';
  const showTutorial = urlParams.get('tutorial') === 'true';
  
  const { data: tutorial } = useQuery({
    queryKey: ['/api/commands/tutorial'],
    enabled: showTutorial
  });

  if (!showTutorial || !tutorial) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Bot Invitation Successful!</h1>
          <p className="text-lg text-muted-foreground">
            Raptor Bot has been successfully added to your Discord server.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Server Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Server Name:</span>
                <span className="text-muted-foreground">{guildName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Bot Status:</span>
                <span className="text-green-600">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Commands:</span>
                <span className="text-muted-foreground">60+ Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={() => setLocation('/')}
            className="w-full md:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Bot Successfully Installed!</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Raptor Bot has been added to <strong>{guildName}</strong>
        </p>
        <Badge variant="outline" className="text-sm">
          Complete Command Tutorial & Implementation Guide
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="license">License Mgmt</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="candy">Candy System</TabsTrigger>
          <TabsTrigger value="support">Support Tags</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                {tutorial.overview.title}
              </CardTitle>
              <CardDescription>{tutorial.overview.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold">60+ Commands</h3>
                  <p className="text-sm text-muted-foreground">Complete bot functionality</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Database className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold">Real API Integration</h3>
                  <p className="text-sm text-muted-foreground">Working license key generation</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Code className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-semibold">TypeScript & PostgreSQL</h3>
                  <p className="text-sm text-muted-foreground">Professional architecture</p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Architecture Overview</h3>
                <p className="text-muted-foreground">{tutorial.overview.architecture}</p>
                
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Quick Start Commands</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <code>/ping</code> - Test bot responsiveness
                    <code>/help</code> - Show command list
                    <code>/verify ABC123</code> - Discord verification
                    <code>/generate-paypal</code> - Create license key
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                {tutorial.categories.license_management.title}
              </CardTitle>
              <CardDescription>{tutorial.categories.license_management.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tutorial.categories.license_management.commands.map((cmd, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{cmd.name}</Badge>
                      <span className="text-sm text-muted-foreground">{cmd.description}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Usage:</h4>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{cmd.usage}</code>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">How it works:</h4>
                        <p className="text-sm text-muted-foreground">{cmd.code_explanation}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Database Operations:</h4>
                        <div className="flex flex-wrap gap-1">
                          {cmd.database_operations.map((op, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{op}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6" />
                {tutorial.categories.payment_processing.title}
              </CardTitle>
              <CardDescription>{tutorial.categories.payment_processing.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Real API Integration</h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  These commands call the actual Raptor API (www.raptor.fun/api/whitelist) and return working license keys.
                </p>
              </div>

              <div className="space-y-6">
                {tutorial.categories.payment_processing.commands.map((cmd, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{cmd.name}</Badge>
                      <span className="text-sm text-muted-foreground">{cmd.description}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Usage:</h4>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{cmd.usage}</code>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Implementation:</h4>
                        <p className="text-sm text-muted-foreground">{cmd.code_explanation}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">API Integration:</h4>
                        <p className="text-sm text-muted-foreground">{cmd.api_integration}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Supported Payment Methods</h4>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <Badge variant="outline">PayPal</Badge>
                  <Badge variant="outline">Bitcoin</Badge>
                  <Badge variant="outline">Ethereum</Badge>
                  <Badge variant="outline">Robux</Badge>
                  <Badge variant="outline">CashApp</Badge>
                  <Badge variant="outline">Venmo</Badge>
                  <Badge variant="outline">Litecoin</Badge>
                  <Badge variant="outline">Sellix</Badge>
                  <Badge variant="outline">Giftcard</Badge>
                  <Badge variant="outline">Custom</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GamepadIcon className="h-6 w-6" />
                {tutorial.categories.candy_economy.title}
              </CardTitle>
              <CardDescription>{tutorial.categories.candy_economy.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {tutorial.categories.candy_economy.commands.map((cmd, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{cmd.name}</Badge>
                      <span className="text-sm text-muted-foreground">{cmd.description}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Usage:</h4>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{cmd.usage}</code>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Game Mechanics:</h4>
                        <p className="text-sm text-muted-foreground">{cmd.game_mechanics}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Database Operations:</h4>
                        <div className="flex flex-wrap gap-1">
                          {cmd.database_operations.map((op, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{op}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">All Candy Commands</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Badge variant="outline">/daily</Badge>
                  <Badge variant="outline">/balance</Badge>
                  <Badge variant="outline">/gamble</Badge>
                  <Badge variant="outline">/deposit</Badge>
                  <Badge variant="outline">/withdraw</Badge>
                  <Badge variant="outline">/transfer</Badge>
                  <Badge variant="outline">/leaderboard</Badge>
                  <Badge variant="outline">/beg</Badge>
                  <Badge variant="outline">/scam</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-6 w-6" />
                {tutorial.categories.macsploit_support.title}
              </CardTitle>
              <CardDescription>{tutorial.categories.macsploit_support.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Message-Based Support System</h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Users type support tags like .hwid, .crash, .install in Discord messages for instant help responses.
                </p>
              </div>

              <div className="space-y-6">
                {tutorial.categories.macsploit_support.commands.map((cmd, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{cmd.name}</Badge>
                      <span className="text-sm text-muted-foreground">{cmd.description}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">Trigger:</h4>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{cmd.trigger}</code>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm">Implementation:</h4>
                        <p className="text-sm text-muted-foreground">{cmd.code_explanation}</p>
                      </div>
                      
                      {cmd.smart_features && (
                        <div>
                          <h4 className="font-medium text-sm">Smart Features:</h4>
                          <p className="text-sm text-muted-foreground">{cmd.smart_features}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">All Support Tags (22 total)</h4>
                <div className="grid grid-cols-6 gap-1 text-xs">
                  {['.hwid', '.crash', '.install', '.scripts', '.autoexe', '.badcpu', '.cookie', 
                    '.elevated', '.fwaeh', '.giftcard', '.iy', '.multi-instance', '.offline', 
                    '.paypal', '.robux', '.sellsn', '.uicrash', '.user', '.zsh', '.anticheat', 
                    '.rapejaml', '.nigger'].map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-6 w-6" />
                Technical Implementation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Architecture</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Database:</span>
                      <span className="text-muted-foreground">{tutorial.technical_implementation.architecture.database}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Bot Framework:</span>
                      <span className="text-muted-foreground">{tutorial.technical_implementation.architecture.bot_framework}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">API Integration:</span>
                      <span className="text-muted-foreground">{tutorial.technical_implementation.architecture.api_integration}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Code Structure</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Command Registration:</strong> {tutorial.technical_implementation.code_structure.command_registration}</div>
                    <div><strong>Error Handling:</strong> {tutorial.technical_implementation.code_structure.error_handling}</div>
                    <div><strong>Rate Limiting:</strong> {tutorial.technical_implementation.code_structure.rate_limiting}</div>
                    <div><strong>Logging:</strong> {tutorial.technical_implementation.code_structure.logging}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Security Features</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Permission Checks:</strong> {tutorial.technical_implementation.security_features.permission_checks}</div>
                    <div><strong>Input Validation:</strong> {tutorial.technical_implementation.security_features.input_validation}</div>
                    <div><strong>API Protection:</strong> {tutorial.technical_implementation.security_features.api_key_protection}</div>
                    <div><strong>Audit Trails:</strong> {tutorial.technical_implementation.security_features.audit_trails}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Deployment</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Environment Variables</h4>
                      <div className="space-y-1 text-sm">
                        {tutorial.deployment_notes.environment_variables.map((envVar, i) => (
                          <div key={i} className="bg-muted p-2 rounded text-xs font-mono">{envVar}</div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Production Setup</h4>
                      <div className="space-y-1 text-sm">
                        {tutorial.deployment_notes.production_setup.map((note, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center mt-8">
        <Button 
          onClick={() => setLocation('/')}
          className="w-full md:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}