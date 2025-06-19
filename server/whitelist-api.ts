import { storage } from "./storage";
import { secureUtils } from "./security-hardening";
import { raptorBot } from "./discord-bot";

const WHITELIST_API_BASE = "https://www.raptor.fun/api";
const API_KEY = '85f9e513-8030-4e88-a04d-042e62e0f707';
const PAYMENTS_API_KEY = process.env.RAPTOR_PAYMENTS_API_KEY || API_KEY;

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
      
      console.log(`[DEBUG] API Key value: ${API_KEY}`);
      console.log(`[DEBUG] API Key type: ${typeof API_KEY}`);

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
      try {
        await raptorBot.sendErrorDM(error, `Whitelist API Error - Contact: ${contactInfo} | Payment: ${paymentProvider}:${paymentId}`);
      } catch (dmError) {
        console.error('Failed to send error DM:', dmError);
      }
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
        identifier: keyValue,
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
        
        try {
          await storage.revokeDiscordKey(keyValue, 'dewhitelisted');
          console.log('✅ Key marked as dewhitelisted in local database');
        } catch (dbError) {
          console.log('⚠️ Failed to update local database:', dbError.message);
        }

        return {
          success: true,
          message: 'Key successfully dewhitelisted ✓'
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
      console.log(`[REWHITELIST] Direct API call for: ${keyValue}`);
      
      
      const requestPayload = {
        identifier: keyValue,
        reason_note: reasonNote,
        api_key: API_KEY
      };

      console.log('[REWHITELIST] Request payload:', { ...requestPayload, api_key: '[REDACTED]' });

      const response = await fetch(`${WHITELIST_API_BASE}/api/rewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseText = await response.text();
      console.log('[REWHITELIST] Response Status:', response.status);
      console.log('[REWHITELIST] Response Body:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.log('[REWHITELIST] Failed to parse JSON response');
        responseData = { message: responseText };
      }

      
      
      if (response.status === 200 && responseData.success === true) {
        
        try {
          await storage.reactivateDiscordKey(keyValue, 'rewhitelisted');
          console.log('[REWHITELIST] Key marked as rewhitelisted in local database');
        } catch (dbError) {
          console.log('[REWHITELIST] Failed to update local database:', dbError.message);
        }

        return {
          success: true,
          message: 'Key successfully rewhitelisted ✓'
        };
      } else if (response.status === 400 && responseData.message === "This key has not been activated.") {
        
        return {
          success: false,
          error: 'This key isn\'t hwid locked'
        };
      } else {
        return {
          success: false,
          error: responseData.message || responseData.error || responseText || 'Failed to rewhitelist key'
        };
      }

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


export async function getPaymentInfo(
  infoType: string,
  parameter: string
): Promise<{ success: boolean; data?: any; message: string }> {
  
  
  infoType = secureUtils.sanitizeInput(infoType);
  parameter = secureUtils.sanitizeInput(parameter);
  
  
  const validInfoTypes = ['trialInfo', 'hwidInfo', 'keyInfo', 'paymentHistory'];
  if (!validInfoTypes.includes(infoType)) {
    return { success: false, message: 'Invalid info type' };
  }
  
  try {
    let endpoint = '';
    let params = new URLSearchParams();
    
    
    switch (infoType) {
      case 'trialInfo':
        endpoint = '/api/payments/info';
        params.append('info', 'trialInfo');
        params.append('hwid', parameter);
        break;
        
      case 'hwidInfo':
        endpoint = '/api/payments/info';
        params.append('info', 'hwidInfo');
        params.append('hwid', parameter);
        break;
        
      case 'keyInfo':
        endpoint = '/api/payments/info';
        params.append('info', 'keyInfo');
        params.append('key', parameter);
        break;
        
      case 'paymentHistory':
        endpoint = '/api/payments/info';
        params.append('info', 'paymentHistory');
        
        if (parameter.includes('@') || parameter.includes('#')) {
          params.append('contactInfo', parameter);
        } else {
          params.append('id', parameter);
        }
        break;
    }
    
    const url = `${WHITELIST_API_BASE}${endpoint}?${params.toString()}`;
    
    const finalUrl = `${WHITELIST_API_BASE}${endpoint}?${params.toString()}`;
    
    console.log(`[getPaymentInfo] Calling ${infoType} API:`, finalUrl);
    console.log(`[getPaymentInfo] Using payments API key:`, PAYMENTS_API_KEY ? '[PROVIDED]' : '[NOT PROVIDED]');
    
    const authMethods = [
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYMENTS_API_KEY}`,
          'User-Agent': 'RaptorBot/1.0'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PAYMENTS_API_KEY,
          'User-Agent': 'RaptorBot/1.0'
        }
      },
      {
        url: `${finalUrl}&api_key=${PAYMENTS_API_KEY}`,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RaptorBot/1.0'
        }
      }
    ];
    
    let response;
    let lastError = '';
    
    for (let i = 0; i < authMethods.length; i++) {
      const method = authMethods[i];
      const requestUrl = method.url || finalUrl;
      
      console.log(`[getPaymentInfo] Trying auth method ${i + 1}:`, method.headers);
      
      try {
        response = await fetch(requestUrl, {
          method: 'GET',
          headers: method.headers
        });
        
        const responseText = await response.text();
        console.log(`[getPaymentInfo] Method ${i + 1} Response Status: ${response.status}`);
        console.log(`[getPaymentInfo] Method ${i + 1} Response Body: ${responseText}`);
        
        if (response.ok) {
          console.log(`[getPaymentInfo] Success with auth method ${i + 1}`);
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            console.error('[getPaymentInfo] Failed to parse JSON response:', responseText);
            return {
              success: false,
              message: 'Invalid JSON response from API'
            };
          }
          
          await storage.logActivity('api_call', `Payment info query: ${infoType} for ${parameter}`);
          
          return {
            success: true,
            data: responseData,
            message: 'Information retrieved successfully'
          };
        } else {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
            lastError = errorData.message || `API Error: ${response.status}`;
          } catch (e) {
            lastError = `HTTP ${response.status}: ${responseText}`;
          }
          console.log(`[getPaymentInfo] Method ${i + 1} failed:`, lastError);
        }
      } catch (error) {
        console.error(`[getPaymentInfo] Method ${i + 1} error:`, error);
        lastError = `Network error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      message: lastError || 'All authentication methods failed'
    };
    
    const responseText = await response.text();
    console.log(`[getPaymentInfo] Response Status: ${response.status}`);
    console.log(`[getPaymentInfo] Response Body: ${responseText}`);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[getPaymentInfo] Failed to parse JSON response:', responseText);
      return {
        success: false,
        message: 'Invalid JSON response from API'
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        message: responseData.message || `API Error: ${response.status}`
      };
    }
    
    
    await storage.logActivity('api_call', `Payment info query: ${infoType} for ${parameter}`);
    
    return {
      success: true,
      data: responseData,
      message: 'Information retrieved successfully'
    };
    
  } catch (error) {
    console.error('Payment info API error:', error);
    return {
      success: false,
      message: 'Failed to retrieve payment information'
    };
  }
}