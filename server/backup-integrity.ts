import { storage } from "./storage";
import { type InsertBackupIntegrity } from "@shared/schema";
import crypto from "crypto";

export class BackupIntegrityChecker {
  
  /**
   * Calculate backup health score based on multiple factors
   */
  static calculateHealthScore(backupData: any): {
    score: number;
    status: 'healthy' | 'warning' | 'critical' | 'corrupted';
    issues: string[];
    completeness: number;
  } {
    const issues: string[] = [];
    let score = 100;
    let completeness = 100;

    // Check data structure integrity
    if (!backupData || typeof backupData !== 'object') {
      issues.push('Invalid backup data structure');
      score -= 50;
      completeness -= 50;
    }

    // Verify required fields
    const requiredFields = ['id', 'serverId', 'serverName', 'timestamp', 'backupType'];
    for (const field of requiredFields) {
      if (!backupData[field]) {
        issues.push(`Missing required field: ${field}`);
        score -= 10;
        completeness -= 10;
      }
    }

    // Check timestamp validity
    if (backupData.timestamp) {
      const timestamp = new Date(backupData.timestamp);
      if (isNaN(timestamp.getTime())) {
        issues.push('Invalid timestamp format');
        score -= 15;
      }

      // Check if backup is too old (more than 30 days)
      const daysSinceBackup = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBackup > 30) {
        issues.push('Backup is older than 30 days');
        score -= 10;
      }
    }

    // Validate data completeness based on backup type
    if (backupData.backupType === 'full' || backupData.backupType === 'channels') {
      if (!backupData.channels || !Array.isArray(backupData.channels)) {
        issues.push('Missing or invalid channels data');
        score -= 20;
        completeness -= 25;
      } else if (backupData.channels.length === 0) {
        issues.push('No channels found in backup');
        score -= 10;
        completeness -= 15;
      }
    }

    if (backupData.backupType === 'full' || backupData.backupType === 'roles') {
      if (!backupData.roles || !Array.isArray(backupData.roles)) {
        issues.push('Missing or invalid roles data');
        score -= 20;
        completeness -= 25;
      } else if (backupData.roles.length === 0) {
        issues.push('No roles found in backup');
        score -= 5; // Less critical
      }
    }

    if (backupData.backupType === 'full' || backupData.backupType === 'members') {
      if (!backupData.members || !Array.isArray(backupData.members)) {
        issues.push('Missing or invalid members data');
        score -= 15;
        completeness -= 20;
      } else if (backupData.members.length === 0) {
        issues.push('No members found in backup');
        score -= 5;
      }
    }

    // Check data corruption indicators
    if (backupData.channels) {
      for (const channel of backupData.channels) {
        if (!channel.id || !channel.name) {
          issues.push('Corrupted channel data detected');
          score -= 5;
          break;
        }
      }
    }

    if (backupData.roles) {
      for (const role of backupData.roles) {
        if (!role.id || !role.name) {
          issues.push('Corrupted role data detected');
          score -= 5;
          break;
        }
      }
    }

    // Calculate backup size score
    const backupSize = JSON.stringify(backupData).length;
    if (backupSize < 1000) { // Very small backup
      issues.push('Backup size unusually small');
      score -= 15;
      completeness -= 20;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    completeness = Math.max(0, completeness);

    // Determine status based on score
    let status: 'healthy' | 'warning' | 'critical' | 'corrupted';
    if (score >= 85) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else if (score >= 30) {
      status = 'critical';
    } else {
      status = 'corrupted';
    }

    return { score, status, issues, completeness };
  }

  /**
   * Generate checksum for backup data
   */
  static generateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verify backup integrity against stored checksum
   */
  static verifyChecksum(data: any, expectedChecksum?: string): boolean {
    if (!expectedChecksum) return true; // No checksum to verify against
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Perform comprehensive backup integrity check
   */
  static async performIntegrityCheck(
    backupId: string, 
    backupData: any, 
    checkedBy: string = 'system',
    autoCheck: boolean = false
  ): Promise<{
    healthScore: number;
    integrityStatus: string;
    dataCompleteness: number;
    checksumValid: boolean;
    corruptedElements: any[];
    missingElements: any[];
    validationErrors: any[];
    performanceMetrics: any;
  }> {
    
    const { score, status, issues, completeness } = this.calculateHealthScore(backupData);
    
    // Generate performance metrics
    const performanceMetrics = {
      backupSize: JSON.stringify(backupData).length,
      channelCount: backupData.channels?.length || 0,
      roleCount: backupData.roles?.length || 0,
      memberCount: backupData.members?.length || 0,
      messageCount: backupData.messages?.length || 0,
      creationTime: backupData.timestamp,
      checkTime: new Date().toISOString(),
    };

    // Identify corrupted and missing elements
    const corruptedElements: any[] = [];
    const missingElements: any[] = [];
    const validationErrors: any[] = [];

    // Check for corrupted channels
    if (backupData.channels) {
      backupData.channels.forEach((channel: any, index: number) => {
        if (!channel.id || !channel.name) {
          corruptedElements.push({
            type: 'channel',
            index,
            reason: 'Missing required fields (id or name)',
            data: channel
          });
        }
      });
    } else if (backupData.backupType === 'full' || backupData.backupType === 'channels') {
      missingElements.push({
        type: 'channels',
        reason: 'Channels array missing from backup'
      });
    }

    // Check for corrupted roles
    if (backupData.roles) {
      backupData.roles.forEach((role: any, index: number) => {
        if (!role.id || !role.name) {
          corruptedElements.push({
            type: 'role',
            index,
            reason: 'Missing required fields (id or name)',
            data: role
          });
        }
      });
    } else if (backupData.backupType === 'full' || backupData.backupType === 'roles') {
      missingElements.push({
        type: 'roles',
        reason: 'Roles array missing from backup'
      });
    }

    // Add validation errors for each issue
    issues.forEach(issue => {
      validationErrors.push({
        severity: score < 30 ? 'critical' : score < 60 ? 'warning' : 'info',
        message: issue,
        timestamp: new Date().toISOString()
      });
    });

    // Verify checksum if available
    const checksumValid = this.verifyChecksum(backupData, backupData.checksum);
    if (!checksumValid) {
      validationErrors.push({
        severity: 'critical',
        message: 'Backup checksum verification failed',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate total and valid elements
    const totalElements = 
      (backupData.channels?.length || 0) + 
      (backupData.roles?.length || 0) + 
      (backupData.members?.length || 0);
    const validElements = totalElements - corruptedElements.length;

    // Store integrity check result
    const integrityData: InsertBackupIntegrity = {
      backupId,
      serverId: backupData.serverId,
      serverName: backupData.serverName,
      backupType: backupData.backupType,
      healthScore: score,
      integrityStatus: status,
      dataCompleteness: completeness,
      checksumValid,
      totalElements,
      validElements,
      corruptedElements,
      missingElements,
      validationErrors,
      performanceMetrics,
      checkedBy,
      autoCheck,
      metadata: {
        checkVersion: '1.0',
        checkDuration: Date.now(), // Will be updated after completion
      }
    };

    try {
      await storage.createBackupIntegrityCheck(integrityData);
    } catch (error) {
      console.error('Failed to store integrity check result:', error);
      // Continue without failing the backup process
    }

    return {
      healthScore: score,
      integrityStatus: status,
      dataCompleteness: completeness,
      checksumValid,
      corruptedElements,
      missingElements,
      validationErrors,
      performanceMetrics,
    };
  }

  /**
   * Run automated integrity checks on all backups
   */
  static async runAutomatedChecks(): Promise<void> {
    try {
      const backups = await storage.getAllBackups();
      console.log(`Running automated integrity checks on ${backups.length} backups...`);

      for (const backup of backups) {
        try {
          await this.performIntegrityCheck(backup.id, backup, 'system', true);
          
          // Log activity
          await storage.logActivity({
            type: 'backup_integrity_check',
            userId: 'system',
            description: `Automated integrity check completed for backup ${backup.id}`,
            metadata: { 
              backupId: backup.id, 
              serverId: backup.serverId,
              serverName: backup.serverName 
            }
          });
        } catch (error) {
          console.error(`Failed to check integrity for backup ${backup.id}:`, error);
        }
      }

      console.log('Automated integrity checks completed');
    } catch (error) {
      console.error('Failed to run automated integrity checks:', error);
    }
  }

  /**
   * Get integrity recommendations based on health score
   */
  static getIntegrityRecommendations(healthScore: number, issues: string[]): string[] {
    const recommendations: string[] = [];

    if (healthScore < 30) {
      recommendations.push('❌ Backup is severely corrupted - consider creating a new backup');
      recommendations.push('🔄 Restore from a previous healthy backup if available');
    } else if (healthScore < 60) {
      recommendations.push('⚠️ Backup has significant issues - review and repair if possible');
      recommendations.push('📋 Create a new backup to ensure data safety');
    } else if (healthScore < 85) {
      recommendations.push('⚡ Backup has minor issues but is generally usable');
      recommendations.push('🔍 Monitor for recurring problems');
    } else {
      recommendations.push('✅ Backup is healthy and reliable');
      recommendations.push('📅 Schedule regular integrity checks');
    }

    // Add specific recommendations based on issues
    if (issues.some(issue => issue.includes('timestamp'))) {
      recommendations.push('🕒 Fix timestamp issues in backup metadata');
    }

    if (issues.some(issue => issue.includes('channels'))) {
      recommendations.push('📺 Verify channel permissions and recreate channel backup');
    }

    if (issues.some(issue => issue.includes('roles'))) {
      recommendations.push('👥 Review role configurations and permissions');
    }

    if (issues.some(issue => issue.includes('checksum'))) {
      recommendations.push('🔐 Backup data may be tampered - verify source integrity');
    }

    return recommendations;
  }
}