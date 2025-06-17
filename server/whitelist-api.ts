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

      const response = await fetch(`${WHITELIST_API_BASE}/api/whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Raptor-Discord-Bot/1.0'
        },
        body: JSON.stringify(requestPayload)
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Log successful whitelist operation
        await storage.logActivity('whitelist_success', 
          `User ${contactInfo} successfully whitelisted with ${paymentProvider} payment ${paymentId}`
        );

        return {
          success: true,
          message: responseData.message,
          key: responseData.key
        };
      } else {
        // Log failed whitelist operation
        await storage.logActivity('whitelist_failed', 
          `Failed to whitelist user ${contactInfo}: ${responseData.error || 'Unknown error'}`
        );

        return {
          success: false,
          error: responseData.error || 'Whitelist operation failed'
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

  static async dewhitelistUser(keyId: string): Promise<WhitelistResponse> {
    try {
      // For dewhitelisting, we'll use a different endpoint or method
      // This is a placeholder for the actual dewhitelist API call
      const response = await fetch(`${WHITELIST_API_BASE}/api/dewhitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Raptor-Discord-Bot/1.0'
        },
        body: JSON.stringify({
          api_key: API_KEY,
          key_id: keyId
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        
        await storage.logActivity('dewhitelist_success', 
          `Key ${keyId} successfully dewhitelisted`
        );

        return {
          success: true,
          message: responseData.message || 'Key successfully dewhitelisted'
        };
      } else {
        const errorData = await response.json();
        
        await storage.logActivity('dewhitelist_failed', 
          `Failed to dewhitelist key ${keyId}: ${errorData.error || 'Unknown error'}`
        );

        return {
          success: false,
          error: errorData.error || 'Dewhitelist operation failed'
        };
      }

    } catch (error) {
      console.error('Dewhitelist API error:', error);
      
      await storage.logActivity('dewhitelist_error', 
        `Dewhitelist API error for key ${keyId}: ${error.message}`
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