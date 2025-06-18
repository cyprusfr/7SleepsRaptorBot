import { storage } from "./storage";

// Real whitelist API configuration
const WHITELIST_API_BASE = "https://www.raptor.fun";
const API_KEY = "85f9e513-8030-4e88-a04d-042e62e0f707";
const ADMIN_API_KEY = process.env.RAPTOR_ADMIN_API_KEY || '';
const DEWHITELIST_ENDPOINT = process.env.RAPTOR_DEWHITELIST_ENDPOINT || '/api/dewhitelist';

// Accepted payment methods from the API
const ACCEPTED_PAYMENT_METHODS = [
  "paypal",
  "cashapp", 
  "robux",
  "giftcard",
  "venmo",
  "bitcoin",
  "ethereum",
  "litecoin",
  "sellix",
  "custom"
];

export interface WhitelistRequest {
  api_key: string;
  contact_info: string;
  user_note: string;
  payment: {
    id: string;
    provider: string;
  };
}

export interface WhitelistResponse {
  success: boolean;
  message?: string;
  key?: string;
  error?: string;
}

export class WhitelistAPI {
  
  static async whitelistUser(
    contactInfo: string,
    userNote: string,
    paymentId: string,
    paymentProvider: string
  ): Promise<WhitelistResponse> {
    try {
      console.log(`Making whitelist API request for contact: ${contactInfo}`);
      
      const requestPayload: WhitelistRequest = {
        api_key: API_KEY,
        contact_info: contactInfo,
        user_note: userNote,
        payment: {
          id: paymentId,
          provider: paymentProvider
        }
      };

      const response = await fetch(`${WHITELIST_API_BASE}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Raptor-Discord-Bot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseData = await response.json();
      
      console.log(`Whitelist API Response: ${response.status}`, responseData);

      if (response.ok && responseData.success && responseData.key) {
        await storage.logActivity('whitelist_success', 
          `Key generated successfully: ${responseData.key} for ${contactInfo}`
        );

        return {
          success: true,
          key: responseData.key,
          message: responseData.message || 'Key generated successfully'
        };
      } else {
        await storage.logActivity('whitelist_failed', 
          `Whitelist failed for ${contactInfo}: ${responseData.message || 'Unknown error'}`
        );

        return {
          success: false,
          message: responseData.message || 'Failed to generate key',
          error: responseData.error
        };
      }

    } catch (error) {
      console.error('Whitelist API error:', error);
      
      await storage.logActivity('whitelist_error', 
        `Whitelist API error for ${contactInfo}: ${error.message}`
      );

      return {
        success: false,
        error: `API request failed: ${error.message}`
      };
    }
  }

  static async dewhitelistUser(keyValue: string): Promise<WhitelistResponse> {
    try {
      console.log(`[DEBUG] Dewhitelisting key: ${keyValue}`);
      
      // Try to get the Discord ID associated with this key for better dewhitelist success
      let deleteValue = keyValue;
      try {
        const keyInfo = await storage.getKeyInfo(keyValue);
        if (keyInfo && keyInfo.userId) {
          deleteValue = keyInfo.userId;
          console.log(`Using Discord ID for dewhitelist: ${deleteValue}`);
        }
      } catch (dbError) {
        console.log('Could not find key in database, using key value directly');
      }

      // Update local database first
      try {
        await storage.revokeDiscordKey(keyValue, 'system');
        console.log('✅ Key marked as revoked in local database');
      } catch (dbError) {
        console.log('⚠️ Failed to update local database:', dbError.message);
      }

      // Comprehensive admin API testing
      if (!ADMIN_API_KEY) {
        console.log('⚠️ Admin API key not configured');
        return {
          success: false,
          message: '❌ Admin API credentials required for actual dewhitelisting. Key marked as revoked locally but may still work in Raptor system.'
        };
      }

      console.log('🔐 Testing comprehensive admin dewhitelist methods...');

      // Define comprehensive test combinations
      const testCombinations = [
        // Admin endpoint variations
        { endpoint: DEWHITELIST_ENDPOINT.startsWith('http') ? DEWHITELIST_ENDPOINT : `${WHITELIST_API_BASE}${DEWHITELIST_ENDPOINT}`, method: 'POST', auth: 'Bearer', payload: { api_key: ADMIN_API_KEY, key: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/admin/dewhitelist`, method: 'POST', auth: 'Bearer', payload: { api_key: ADMIN_API_KEY, delete: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/api/admin/dewhitelist`, method: 'DELETE', auth: 'X-API-Key', payload: { key: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/v1/dewhitelist`, method: 'POST', auth: 'Admin-Key', payload: { admin_key: ADMIN_API_KEY, target: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/api/remove`, method: 'POST', auth: 'Token', payload: { token: ADMIN_API_KEY, remove: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/api/revoke`, method: 'PUT', auth: 'Bearer', payload: { auth: ADMIN_API_KEY, revoke: keyValue } },
        { endpoint: `${WHITELIST_API_BASE}/api/blacklist`, method: 'POST', auth: 'Basic', payload: { api_key: ADMIN_API_KEY, blacklist: keyValue } },
        
        // User ID variations for better success
        { endpoint: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', auth: 'Bearer', payload: { api_key: ADMIN_API_KEY, delete: deleteValue } },
        { endpoint: `${WHITELIST_API_BASE}/admin/dewhitelist`, method: 'POST', auth: 'X-API-Key', payload: { admin_token: ADMIN_API_KEY, user_id: deleteValue } },
        { endpoint: `${WHITELIST_API_BASE}/api/admin/remove`, method: 'DELETE', auth: 'Admin-Key', payload: { key: ADMIN_API_KEY, contact_info: deleteValue } }
      ];

      for (let i = 0; i < testCombinations.length; i++) {
        const test = testCombinations[i];
        
        try {
          console.log(`🔍 Admin Test ${i + 1}/${testCombinations.length}: ${test.method} ${test.endpoint}`);
          
          let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Raptor-Admin-Bot/1.0'
          };

          // Set authentication header based on method
          switch (test.auth) {
            case 'Bearer':
              headers['Authorization'] = `Bearer ${ADMIN_API_KEY}`;
              break;
            case 'X-API-Key':
              headers['X-API-Key'] = ADMIN_API_KEY;
              break;
            case 'Admin-Key':
              headers['Admin-Key'] = ADMIN_API_KEY;
              break;
            case 'Token':
              headers['Authorization'] = `Token ${ADMIN_API_KEY}`;
              break;
            case 'Basic':
              headers['Authorization'] = `Basic ${Buffer.from(`admin:${ADMIN_API_KEY}`).toString('base64')}`;
              break;
          }

          const response = await fetch(test.endpoint, {
            method: test.method,
            headers,
            body: JSON.stringify(test.payload)
          });

          if (response.status === 429) {
            console.log('⚠️ Rate limited, waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }

          let responseData;
          try {
            responseData = await response.json();
          } catch {
            responseData = { success: false, message: 'Invalid JSON response' };
          }

          console.log(`📋 Admin Response ${i + 1}: ${response.status}`, responseData);

          if (response.ok && responseData.success === true) {
            console.log('🎉 WORKING ADMIN DEWHITELIST METHOD FOUND!');
            
            await storage.logActivity('admin_dewhitelist_success', 
              `Key ${keyValue} successfully dewhitelisted via admin API: ${test.method} ${test.endpoint}`
            );

            return {
              success: true,
              message: `✅ REAL DEWHITELIST SUCCESS: Key ${keyValue} has been removed from the Raptor system and will no longer work for users. Method: ${test.method} ${test.endpoint}`
            };
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.log(`❌ Admin Test ${i + 1} failed: ${error.message}`);
          continue;
        }
      }

      console.log('📊 Admin testing completed - no working method found');
      
      await storage.logActivity('dewhitelist_partial', 
        `Key ${keyValue} marked as revoked locally but could not be removed from Raptor system`
      );

      return {
        success: false,
        message: `❌ DEWHITELIST FAILED: Key ${keyValue} marked as revoked locally but could not be removed from Raptor system. Key may still work for users. Contact admin support for manual removal.`
      };

    } catch (error) {
      console.error('Dewhitelist API error:', error);
      
      await storage.logActivity('dewhitelist_error', 
        `Dewhitelist API error for key ${keyValue}: ${error.message}`
      );

      return {
        success: false,
        error: `API request failed: ${error.message}`
      };
    }
  }

  static getAcceptedPaymentMethods(): string[] {
    return [...ACCEPTED_PAYMENT_METHODS];
  }

  static isValidPaymentMethod(method: string): boolean {
    return ACCEPTED_PAYMENT_METHODS.includes(method.toLowerCase());
  }
}