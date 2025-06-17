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

// Payment ID examples based on Nexus42's instructions:
// - PayPal: transaction ID (e.g., "FBDHFF23478HDJ")
// - Robux: Roblox user ID 
// - Giftcard: gift card code
// - Contact info: Discord user ID (e.g., "708504312862474282") or email (e.g., "nexus42@raptor.fun")

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
      // Validate payment provider
      if (!ACCEPTED_PAYMENT_METHODS.includes(paymentProvider.toLowerCase())) {
        return {
          success: false,
          error: `Invalid payment provider. Accepted methods: ${ACCEPTED_PAYMENT_METHODS.join(", ")}`
        };
      }

      const requestPayload: WhitelistRequest = {
        api_key: API_KEY,
        contact_info: contactInfo,
        user_note: userNote,
        payment: {
          id: paymentId,
          provider: paymentProvider.toLowerCase()
        }
      };

      console.log('Making whitelist API request:', requestPayload);
      
      const response = await fetch(`${WHITELIST_API_BASE}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Raptor-Discord-Bot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', Object.fromEntries(response.headers));
      
      const responseData = await response.json();
      console.log('API Response Data:', responseData);

      if (response.ok && responseData.success) {
        // Extract the actual key from the API response structure
        const generatedKey = responseData.data?.new_key || responseData.key;
        
        console.log('API Success - responseData.data:', responseData.data);
        console.log('API Success - new_key value:', responseData.data?.new_key);
        console.log('API Success - generatedKey:', generatedKey);
        console.log('API Success - generatedKey type:', typeof generatedKey);
        
        // Validate key exists and is not empty
        if (!generatedKey || generatedKey === '' || generatedKey === null || generatedKey === undefined) {
          console.error('API returned success but no valid key:', { generatedKey, responseData });
          return {
            success: false,
            error: 'API returned success but no valid license key was provided'
          };
        }
        
        // Log successful whitelist operation
        await storage.logActivity('whitelist_success', 
          `User ${contactInfo} successfully whitelisted with ${paymentProvider} payment ${paymentId} - Key: ${generatedKey} - UUID: ${responseData.data?.record_uuid}`
        );

        return {
          success: true,
          message: responseData.message,
          key: generatedKey
        };
      } else {
        // Log failed whitelist operation
        await storage.logActivity('whitelist_failed', 
          `Failed to whitelist user ${contactInfo}: ${responseData.error || responseData.message || 'Unknown error'} - Status: ${response.status}`
        );

        return {
          success: false,
          error: responseData.error || responseData.message || `API returned status ${response.status}`
        };
      }

    } catch (error) {
      console.error('Whitelist API error:', error);
      
      await storage.logActivity('whitelist_error', 
        `Whitelist API error for user ${contactInfo}: ${error.message}`
      );

      return {
        success: false,
        error: `API request failed: ${error.message}`
      };
    }
  }

  static async dewhitelistUser(keyValue: string): Promise<WhitelistResponse> {
    try {
      // Log dewhitelist attempt
      await storage.logActivity('dewhitelist_attempt', `Attempting to dewhitelist key: ${keyValue}`);

      const requestPayload = {
        api_key: API_KEY,
        key: keyValue // Send the actual key value to dewhitelist
      };

      console.log('Dewhitelist API Request:', {
        url: `${WHITELIST_API_BASE}/api/dewhitelist`,
        payload: { ...requestPayload, api_key: '[REDACTED]' }
      });

      const response = await fetch(`${WHITELIST_API_BASE}/api/dewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Raptor-Discord-Bot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseData = await response.json();
      console.log('Dewhitelist API Response:', responseData);

      if (response.ok && responseData.success) {
        // Log successful dewhitelist operation
        await storage.logActivity('dewhitelist_success', 
          `Key ${keyValue} successfully dewhitelisted via API`
        );

        return {
          success: true,
          message: responseData.message || 'Key dewhitelisted successfully'
        };
      } else {
        // Log failed dewhitelist operation
        await storage.logActivity('dewhitelist_failed', 
          `Failed to dewhitelist key ${keyValue}: ${responseData.error || responseData.message || 'Unknown error'} - Status: ${response.status}`
        );

        return {
          success: false,
          error: responseData.error || responseData.message || `HTTP ${response.status} error`
        };
      }

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