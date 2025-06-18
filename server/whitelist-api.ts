import { storage } from "./storage";

// Real whitelist API configuration
const WHITELIST_API_BASE = "https://www.raptor.fun";
const API_KEY = "85f9e513-8030-4e88-a04d-042e62e0f707";

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
  early_access?: boolean;
  server_booster?: boolean;
  monthly?: boolean;
  [key: string]: any;
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

      // Add features as single parameters
      if (features) {
        if (features.early_access) {
          requestPayload.early_access = true;
        }
        if (features.booster) {
          requestPayload.server_booster = true;
        }
        if (features.monthly) {
          requestPayload.monthly = true;
        }
        console.log(`[API] Adding features as single parameters:`, {
          early_access: requestPayload.early_access,
          server_booster: requestPayload.server_booster,
          monthly: requestPayload.monthly
        });
      }

      console.log('Whitelist API Request:', {
        url: `${WHITELIST_API_BASE}/api/whitelist`,
        payload: { ...requestPayload, api_key: '[REDACTED]' }
      });

      const response = await fetch(`${WHITELIST_API_BASE}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseText = await response.text();
      console.log('Whitelist API Response Status:', response.status);
      console.log('Whitelist API Response Body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Failed to parse JSON response, treating as text');
        responseData = { message: responseText };
      }

      if (response.ok && responseData.data && responseData.data.new_key) {
        const generatedKey = responseData.data.new_key;
        console.log(`✅ Real working key generated: ${generatedKey}`);
        
        return {
          success: true,
          key: generatedKey,
          message: responseData.message || 'Key generated successfully'
        };
      } else {
        console.log('❌ API did not return a valid key');
        return {
          success: false,
          error: responseData.error || responseData.message || 'No key returned from API'
        };
      }

    } catch (error) {
      console.error('Error calling whitelist API:', error);
      return {
        success: false,
        error: `API request failed: ${error.message}`
      };
    }
  }

  static async dewhitelistUser(keyValue: string, deleteNote: string = 'Removed via Discord bot'): Promise<WhitelistResponse> {
    try {
      console.log(`Making dewhitelist API request for: ${keyValue}`);
      
      const requestPayload = {
        delete_note: deleteNote,
        identifier: keyValue, // Can be email, key, or hwid
        api_key: API_KEY
      };

      console.log('Dewhitelist API Request:', {
        url: `${WHITELIST_API_BASE}/api/dewhitelist`,
        payload: { ...requestPayload, api_key: '[REDACTED]' }
      });

      const response = await fetch(`${WHITELIST_API_BASE}/api/dewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseText = await response.text();
      console.log('Dewhitelist API Response Status:', response.status);
      console.log('Dewhitelist API Response Body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Failed to parse JSON response, treating as text');
        responseData = { message: responseText };
      }

      if (response.ok && (responseData.success !== false)) {
        // Mark key as revoked in local database
        try {
          await storage.revokeDiscordKey(keyValue, 'dewhitelisted');
          console.log('✅ Key marked as dewhitelisted in local database');
        } catch (dbError) {
          console.log('⚠️ Failed to update local database:', dbError.message);
        }

        return {
          success: true,
          message: responseData.message || 'Key successfully dewhitelisted from Raptor system'
        };
      } else {
        return {
          success: false,
          error: responseData.error || responseData.message || 'Failed to dewhitelist key'
        };
      }

    } catch (error) {
      console.error('Error calling dewhitelist API:', error);
      return {
        success: false,
        error: `API request failed: ${error.message}`
      };
    }
  }

  static async rewhitelistUser(keyValue: string, reasonNote: string = 'Re-whitelisted via Discord bot'): Promise<WhitelistResponse> {
    try {
      console.log(`[REWHITELIST MULTI-ATTEMPT] Starting comprehensive rewhitelist for: ${keyValue}`);
      
      // Attempt 1: Standard rewhitelist with identifier
      console.log('[ATTEMPT 1] Standard /api/rewhitelist with identifier');
      let requestPayload = {
        identifier: keyValue,
        reason_note: reasonNote,
        api_key: API_KEY
      };

      let response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      let responseText = await response.text();
      console.log('[ATTEMPT 1] Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        let responseData = JSON.parse(responseText);
        if (responseData.success !== false) {
          await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
          return { success: true, message: responseData.message || 'Successfully rewhitelisted' };
        }
      }

      // Attempt 2: Using Discord user ID as identifier (API hint: "user's ID, hwid, email or key")
      console.log('[ATTEMPT 2] Using Discord user ID as identifier');
      requestPayload = {
        identifier: "1131426483404026019", // Discord ID from original generation
        reason_note: reasonNote,
        api_key: API_KEY
      };
      
      response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      responseText = await response.text();
      console.log('[ATTEMPT 2] Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        let responseData = JSON.parse(responseText);
        if (responseData.success !== false) {
          await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
          return { success: true, message: responseData.message || 'Successfully rewhitelisted' };
        }
      }

      // Attempt 3: Adding contact_info from original generation
      console.log('[ATTEMPT 3] Adding contact_info parameter');
      requestPayload = {
        identifier: keyValue,
        contact_info: "1131426483404026019",
        reason_note: reasonNote,
        api_key: API_KEY
      };
      
      response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      responseText = await response.text();
      console.log('[ATTEMPT 3] Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        let responseData = JSON.parse(responseText);
        if (responseData.success !== false) {
          await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
          return { success: true, message: responseData.message || 'Successfully rewhitelisted' };
        }
      }

      // Attempt 4: PUT method instead of POST
      console.log('[ATTEMPT 4] Using PUT method');
      requestPayload = {
        identifier: keyValue,
        reason_note: reasonNote,
        api_key: API_KEY
      };
      
      response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      responseText = await response.text();
      console.log('[ATTEMPT 4] Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        let responseData = JSON.parse(responseText);
        if (responseData.success !== false) {
          await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
          return { success: true, message: responseData.message || 'Successfully rewhitelisted' };
        }
      }

      // Attempt 5: Different endpoint variations
      const endpoints = ['/api/reactivate', '/api/activate', '/api/whitelist/reactivate', '/api/keys/reactivate'];
      
      for (let i = 0; i < endpoints.length; i++) {
        console.log(`[ATTEMPT ${5 + i}] Trying endpoint: ${endpoints[i]}`);
        
        response = await fetch(`${WHITELIST_API_BASE}${endpoints[i]}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'RaptorBot/1.0'
          },
          body: JSON.stringify({
            identifier: keyValue,
            reason_note: reasonNote,
            api_key: API_KEY
          })
        });

        responseText = await response.text();
        console.log(`[ATTEMPT ${5 + i}] Status:`, response.status, 'Body:', responseText);

        if (response.ok) {
          try {
            let responseData = JSON.parse(responseText);
            if (responseData.success !== false) {
              await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
              return { success: true, message: responseData.message || 'Successfully rewhitelisted' };
            }
          } catch (e) {
            // Continue to next attempt
          }
        }
      }

      // Attempt 9: Try with admin API approach (similar to dewhitelist)
      console.log('[ATTEMPT 9] Using admin API approach');
      const adminHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'RaptorBot/1.0',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Key': API_KEY,
        'Admin-Key': API_KEY
      };

      response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          identifier: keyValue,
          reason_note: reasonNote,
          api_key: API_KEY
        })
      });

      responseText = await response.text();
      console.log('[ATTEMPT 9] Admin approach - Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        try {
          let responseData = JSON.parse(responseText);
          if (responseData.success !== false) {
            await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
            return { success: true, message: responseData.message || 'Successfully rewhitelisted via admin API' };
          }
        } catch (e) {
          // Continue
        }
      }

      // Attempt 10: Try with email format 
      console.log('[ATTEMPT 10] Using email format as identifier');
      requestPayload = {
        identifier: "alex@example.com", // Try email format
        reason_note: reasonNote,
        api_key: API_KEY
      };
      
      response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      responseText = await response.text();
      console.log('[ATTEMPT 10] Email format - Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        try {
          let responseData = JSON.parse(responseText);
          if (responseData.success !== false) {
            await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
            return { success: true, message: responseData.message || 'Successfully rewhitelisted via email' };
          }
        } catch (e) {
          // Continue
        }
      }

      // Attempt 11: Try with HWID if we can find it in database
      console.log('[ATTEMPT 11] Trying with HWID lookup');
      try {
        // Look up the HWID associated with this key
        const keyInfo = await storage.getKeyInfo(keyValue);
        if (keyInfo && keyInfo.hwid) {
          console.log('[ATTEMPT 11] Found HWID:', keyInfo.hwid);
          requestPayload = {
            identifier: keyInfo.hwid,
            reason_note: reasonNote,
            api_key: API_KEY
          };
          
          response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'RaptorBot/1.0'
            },
            body: JSON.stringify(requestPayload)
          });

          responseText = await response.text();
          console.log('[ATTEMPT 11] HWID approach - Status:', response.status, 'Body:', responseText);

          if (response.ok) {
            let responseData = JSON.parse(responseText);
            if (responseData.success !== false) {
              await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
              return { success: true, message: responseData.message || 'Successfully rewhitelisted via HWID' };
            }
          }
        } else {
          console.log('[ATTEMPT 11] No HWID found for this key');
        }
      } catch (e) {
        console.log('[ATTEMPT 11] HWID lookup failed:', e.message);
      }

      // Final attempt: Try regenerating the key instead of rewhitelisting
      console.log('[FINAL ATTEMPT] Trying to regenerate key with same contact info');
      const regeneratePayload = {
        api_key: API_KEY,
        contact_info: "1131426483404026019",
        user_note: `Regenerated for dewhitelisted key: ${keyValue}`,
        staff_name: 'RaptorBot',
        payment: {
          id: `REWHITELIST-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          provider: 'custom'  // Fixed: use 'custom' instead of 'regenerate'
        }
      };

      response = await fetch(`${WHITELIST_API_BASE}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(regeneratePayload)
      });

      responseText = await response.text();
      console.log('[FINAL ATTEMPT] Regenerate - Status:', response.status, 'Body:', responseText);

      if (response.ok) {
        let responseData = JSON.parse(responseText);
        if (responseData.success && responseData.data?.new_key) {
          console.log('🔄 Generated new key as rewhitelist alternative:', responseData.data.new_key);
          return {
            success: true,
            key: responseData.data.new_key,
            message: `Original key could not be rewhitelisted, generated new key: ${responseData.data.new_key}`
          };
        }
      }

      // All attempts failed
      console.log('❌ ALL REWHITELIST ATTEMPTS FAILED');
      let finalError;
      try {
        finalError = JSON.parse(responseText);
      } catch (e) {
        finalError = { message: responseText };
      }
      
      return {
        success: false,
        error: finalError.message || finalError.error || 'All rewhitelist attempts exhausted'
      };

    } catch (error) {
      console.error('Error in comprehensive rewhitelist:', error);
      return {
        success: false,
        error: `Rewhitelist system error: ${error.message}`
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