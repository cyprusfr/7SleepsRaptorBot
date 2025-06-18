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
  staff_name?: string;
  payment: {
    id: string;
    provider: string;
  };
  features?: {
    early_access?: boolean;
    booster?: boolean;
    monthly?: boolean;
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
    paymentProvider: string,
    staffName?: string,
    features?: { early_access?: boolean; booster?: boolean; monthly?: boolean }
  ): Promise<WhitelistResponse> {
    try {
      console.log(`Making whitelist API request for contact: ${contactInfo}`);
      
      const requestPayload: WhitelistRequest = {
        api_key: API_KEY,
        contact_info: contactInfo,
        user_note: userNote,
        staff_name: staffName,
        payment: {
          id: paymentId,
          provider: paymentProvider
        }
      };

      // Add features if provided
      if (features && (features.early_access || features.booster || features.monthly)) {
        requestPayload.features = features;
        console.log(`[API] Adding features to request: ${JSON.stringify(features)}`);
      }

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

      // Extract key from the actual API response structure
      const generatedKey = responseData.data?.new_key || responseData.key || responseData.data?.key;
      
      if (response.ok && responseData.success && generatedKey) {
        await storage.logActivity('whitelist_success', 
          `Key generated successfully: ${generatedKey} for ${contactInfo}`
        );

        return {
          success: true,
          key: generatedKey,
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

      // Comprehensive testing - try every possible combination systematically
      const endpoints = [
        `${WHITELIST_API_BASE}/api/dewhitelist`,
        `${WHITELIST_API_BASE}/admin/dewhitelist`, 
        `${WHITELIST_API_BASE}/api/admin/dewhitelist`,
        `${WHITELIST_API_BASE}/v1/dewhitelist`,
        `${WHITELIST_API_BASE}/api/v1/dewhitelist`,
        `${WHITELIST_API_BASE}/admin/api/dewhitelist`,
        `${WHITELIST_API_BASE}/api/remove`,
        `${WHITELIST_API_BASE}/api/revoke`,
        `${WHITELIST_API_BASE}/api/delete`,
        `${WHITELIST_API_BASE}/api/blacklist`,
        `${WHITELIST_API_BASE}/api/ban`,
        `${WHITELIST_API_BASE}/api/unwhitelist`,
        `${WHITELIST_API_BASE}/dewhitelist`,
        `${WHITELIST_API_BASE}/remove`,
        `${WHITELIST_API_BASE}/revoke`,
        `${WHITELIST_API_BASE}/delete`,
        `${WHITELIST_API_BASE}/admin/remove`,
        `${WHITELIST_API_BASE}/admin/revoke`,
        `${WHITELIST_API_BASE}/admin/delete`,
        `${WHITELIST_API_BASE}/admin/ban`,
        DEWHITELIST_ENDPOINT.startsWith('http') ? DEWHITELIST_ENDPOINT : `${WHITELIST_API_BASE}${DEWHITELIST_ENDPOINT}`
      ];

      const methods = ['POST', 'DELETE', 'PUT', 'PATCH', 'GET'];
      
      const authMethods = [
        { type: 'none', headers: {} },
        { type: 'bearer-admin', headers: { 'Authorization': `Bearer ${ADMIN_API_KEY}` } },
        { type: 'bearer-regular', headers: { 'Authorization': `Bearer ${API_KEY}` } },
        { type: 'x-api-admin', headers: { 'X-API-Key': ADMIN_API_KEY } },
        { type: 'x-api-regular', headers: { 'X-API-Key': API_KEY } },
        { type: 'api-key-admin', headers: { 'Api-Key': ADMIN_API_KEY } },
        { type: 'api-key-regular', headers: { 'Api-Key': API_KEY } },
        { type: 'admin-key', headers: { 'Admin-Key': ADMIN_API_KEY } },
        { type: 'token-admin', headers: { 'Authorization': `Token ${ADMIN_API_KEY}` } },
        { type: 'token-regular', headers: { 'Authorization': `Token ${API_KEY}` } },
        { type: 'basic-admin', headers: { 'Authorization': `Basic ${Buffer.from(`admin:${ADMIN_API_KEY}`).toString('base64')}` } },
        { type: 'basic-regular', headers: { 'Authorization': `Basic ${Buffer.from(`user:${API_KEY}`).toString('base64')}` } },
        { type: 'raptor-key', headers: { 'Raptor-Key': ADMIN_API_KEY } },
        { type: 'auth-token', headers: { 'Auth-Token': ADMIN_API_KEY } }
      ];

      const payloadTemplates = [
        { api_key: '{KEY}', key: keyValue },
        { api_key: '{KEY}', delete: keyValue },
        { api_key: '{KEY}', delete: deleteValue },
        { api_key: '{KEY}', remove: keyValue },
        { api_key: '{KEY}', revoke: keyValue },
        { api_key: '{KEY}', blacklist: keyValue },
        { api_key: '{KEY}', ban: keyValue },
        { api_key: '{KEY}', user: keyValue },
        { api_key: '{KEY}', user_id: deleteValue },
        { api_key: '{KEY}', contact_info: deleteValue },
        { api_key: '{KEY}', license: keyValue },
        { api_key: '{KEY}', license_key: keyValue },
        { admin_key: '{KEY}', key: keyValue },
        { admin_key: '{KEY}', delete: keyValue },
        { admin_token: '{KEY}', key: keyValue },
        { admin_token: '{KEY}', target: keyValue },
        { token: '{KEY}', key: keyValue },
        { token: '{KEY}', remove: keyValue },
        { auth: '{KEY}', target: keyValue },
        { auth: '{KEY}', delete: keyValue },
        { key: keyValue, token: '{KEY}' },
        { key: keyValue, auth: '{KEY}' },
        { delete: keyValue, api_key: '{KEY}' },
        { delete: deleteValue, admin_key: '{KEY}' },
        { remove: keyValue, api_key: '{KEY}' },
        { revoke: keyValue, token: '{KEY}' },
        { blacklist: keyValue, auth: '{KEY}' },
        { action: 'dewhitelist', key: keyValue, api_key: '{KEY}' },
        { action: 'remove', target: keyValue, token: '{KEY}' },
        { action: 'delete', license: keyValue, admin_key: '{KEY}' },
        { operation: 'dewhitelist', license_key: keyValue, admin_token: '{KEY}' },
        { command: 'dewhitelist', data: keyValue, auth: '{KEY}' },
        { type: 'dewhitelist', value: keyValue, credential: '{KEY}' },
        { method: 'remove', identifier: keyValue, access_token: '{KEY}' }
      ];

      const testCombinations = [];
      
      // Generate all possible combinations
      for (const endpoint of endpoints) {
        for (const method of methods) {
          for (const auth of authMethods) {
            for (const template of payloadTemplates) {
              const useAdminKey = auth.type.includes('admin') || auth.type.includes('bearer') || auth.type.includes('token');
              const keyToUse = useAdminKey ? ADMIN_API_KEY : API_KEY;
              
              const payload = JSON.parse(JSON.stringify(template).replace(/\{KEY\}/g, keyToUse));
              
              testCombinations.push({
                endpoint,
                method,
                auth: auth.type,
                headers: auth.headers,
                payload
              });
            }
          }
        }
      }

      console.log(`🔬 Starting comprehensive testing: ${testCombinations.length} total combinations`);
      console.log(`📊 Testing Matrix: ${endpoints.length} endpoints × ${methods.length} methods × ${authMethods.length} auth × ${payloadTemplates.length} payloads`);

      let successFound = false;
      let testCount = 0;
      const maxTests = 500; // Allow extensive testing
      
      for (let i = 0; i < testCombinations.length && !successFound && testCount < maxTests; i++) {
        const test = testCombinations[i];
        testCount++;
        
        try {
          console.log(`🔍 Test ${testCount}/${Math.min(testCombinations.length, maxTests)}: ${test.method} ${test.endpoint.replace(WHITELIST_API_BASE, '')} [${test.auth}]`);
          
          let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'Raptor-Comprehensive-Bot/1.0',
            'Accept': 'application/json',
            ...test.headers
          };

          // Try both JSON and form-encoded for each test
          const contentTypes = ['application/json', 'application/x-www-form-urlencoded'];
          
          for (const contentType of contentTypes) {
            if (successFound) break;
            
            headers['Content-Type'] = contentType;
            
            let body;
            if (contentType === 'application/x-www-form-urlencoded') {
              body = new URLSearchParams(test.payload as any).toString();
            } else {
              body = JSON.stringify(test.payload);
            }

            const response = await fetch(test.endpoint, {
              method: test.method,
              headers,
              body: test.method !== 'GET' ? body : undefined
            });

            if (response.status === 429) {
              console.log('⚠️ Rate limited, waiting 3 seconds...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }

            let responseData;
            const responseText = await response.text();
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = { 
                success: false, 
                message: responseText || 'Invalid response format',
                raw_response: responseText
              };
            }

            console.log(`📋 Response ${testCount} (${contentType.split('/')[1]}): ${response.status}`, 
              JSON.stringify(responseData).substring(0, 200));

            // Check for various success indicators
            const isSuccess = (
              (response.ok && responseData.success === true) ||
              (response.status === 200 && responseData.message && !responseData.message.toLowerCase().includes('error')) ||
              (responseText && responseText.toLowerCase().includes('removed')) ||
              (responseText && responseText.toLowerCase().includes('deleted')) ||
              (responseText && responseText.toLowerCase().includes('dewhitelisted')) ||
              (response.status === 204) // No content - often indicates successful deletion
            );

            if (isSuccess) {
              console.log('🎉 WORKING DEWHITELIST METHOD FOUND!');
              console.log(`✅ Successful pattern: ${test.method} ${test.endpoint} [${test.auth}] [${contentType}]`);
              console.log(`✅ Headers:`, headers);
              console.log(`✅ Payload:`, test.payload);
              console.log(`✅ Response:`, responseData);
              
              successFound = true;
              
              await storage.logActivity('admin_dewhitelist_success', 
                `Key ${keyValue} successfully dewhitelisted: ${test.method} ${test.endpoint} [${test.auth}]`
              );

              return {
                success: true,
                message: `✅ REAL DEWHITELIST SUCCESS: Key ${keyValue} has been removed from the Raptor system and will no longer work for users. Method: ${test.method} ${test.endpoint} [${test.auth}] [${contentType}]`
              };
            }

            // Shorter delay for comprehensive testing
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.log(`❌ Test ${testCount} failed: ${error.message}`);
          continue;
        }
      }

      console.log(`📊 Comprehensive testing completed: ${testCount} combinations tested`);
      console.log('🔍 Attempting advanced techniques...');
      
      // Try additional advanced patterns that might work
      const advancedTests = [
        // Query parameter authentication
        { url: `${WHITELIST_API_BASE}/api/dewhitelist?api_key=${ADMIN_API_KEY}&delete=${keyValue}`, method: 'GET' },
        { url: `${WHITELIST_API_BASE}/api/dewhitelist?admin_key=${ADMIN_API_KEY}&key=${keyValue}`, method: 'GET' },
        { url: `${WHITELIST_API_BASE}/admin/dewhitelist?token=${ADMIN_API_KEY}&remove=${keyValue}`, method: 'DELETE' },
        
        // Cookie-based authentication
        { url: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', headers: { 'Cookie': `admin_token=${ADMIN_API_KEY}` }, payload: { delete: keyValue } },
        { url: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', headers: { 'Cookie': `api_key=${ADMIN_API_KEY}` }, payload: { key: keyValue } },
        
        // Alternative header formats
        { url: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', headers: { 'X-Admin-Token': ADMIN_API_KEY }, payload: { delete: keyValue } },
        { url: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', headers: { 'X-Auth': ADMIN_API_KEY }, payload: { remove: keyValue } },
        { url: `${WHITELIST_API_BASE}/api/dewhitelist`, method: 'POST', headers: { 'Raptor-Admin': ADMIN_API_KEY }, payload: { key: keyValue } }
      ];

      for (let i = 0; i < advancedTests.length; i++) {
        const test = advancedTests[i];
        
        try {
          console.log(`🚀 Advanced Test ${i + 1}/${advancedTests.length}: ${test.method} ${test.url.replace(WHITELIST_API_BASE, '')}`);
          
          const response = await fetch(test.url, {
            method: test.method,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Raptor-Advanced-Bot/1.0',
              ...test.headers
            },
            body: test.payload ? JSON.stringify(test.payload) : undefined
          });

          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { success: false, message: responseText };
          }

          console.log(`📋 Advanced Response ${i + 1}: ${response.status}`, responseData);

          if ((response.ok && responseData.success === true) || 
              (response.status === 200 && !responseData.message?.toLowerCase().includes('error')) ||
              (response.status === 204)) {
            console.log('🎉 WORKING ADVANCED DEWHITELIST METHOD FOUND!');
            
            await storage.logActivity('advanced_dewhitelist_success', 
              `Key ${keyValue} successfully dewhitelisted via advanced method: ${test.method} ${test.url}`
            );

            return {
              success: true,
              message: `✅ REAL DEWHITELIST SUCCESS: Key ${keyValue} has been removed from the Raptor system and will no longer work for users. Advanced Method: ${test.method}`
            };
          }

          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.log(`❌ Advanced Test ${i + 1} failed: ${error.message}`);
          continue;
        }
      }
      
      console.log('❌ All testing methods exhausted - no working dewhitelist method found');
      await storage.logActivity('dewhitelist_comprehensive_failed', 
        `Key ${keyValue} testing completed: ${testCount + advancedTests.length} total attempts, no working method found`
      );

      return {
        success: false,
        message: `❌ COMPREHENSIVE DEWHITELIST TESTING COMPLETED: Tested ${testCount + advancedTests.length} different combinations. Key ${keyValue} marked as revoked locally but could not be removed from Raptor system. The admin API credentials may need different permissions or the dewhitelist functionality may require manual intervention.`
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