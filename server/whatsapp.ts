import axios from "axios";

/**
 * WhatsApp Cloud API Integration
 * 
 * PLACEHOLDER CONFIGURATION - Replace with your actual credentials:
 * 1. Go to https://developers.facebook.com/
 * 2. Create or select a Business App
 * 3. Navigate to WhatsApp > Getting Started
 * 4. Get your Phone Number ID and Access Token
 * 5. Set these values in your environment variables:
 *    - WHATSAPP_ACCESS_TOKEN
 *    - WHATSAPP_PHONE_NUMBER_ID
 */

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

// PLACEHOLDER: Replace these with actual environment variables
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "YOUR_PHONE_NUMBER_ID_HERE";

interface WhatsAppMessage {
  to: string; // Phone number in format: 393401234567 (without +)
  name: string;
  appointmentTime: string;
}

/**
 * Sends a WhatsApp reminder message
 * 
 * @param message - Message details including recipient phone, name, and appointment time
 * @returns Promise<boolean> - True if message was sent successfully
 */
export async function sendWhatsAppReminder(message: WhatsAppMessage): Promise<boolean> {
  try {
    // Remove + from phone number for WhatsApp API
    const phoneNumber = message.to.replace("+", "");

    // Format the reminder message
    const messageText = `Ciao ${message.name}, ti ricordiamo il tuo appuntamento alle ${message.appointmentTime} di oggi. A presto!`;

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: messageText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ WhatsApp reminder sent to ${message.name} (${message.to})`);
    return response.status === 200;
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error);
    
    // Check if it's a placeholder configuration error
    if (ACCESS_TOKEN === "YOUR_ACCESS_TOKEN_HERE" || PHONE_NUMBER_ID === "YOUR_PHONE_NUMBER_ID_HERE") {
      console.error("⚠️  WHATSAPP CREDENTIALS NOT CONFIGURED!");
      console.error("Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables");
    }
    
    return false;
  }
}

/**
 * Test function to verify WhatsApp API connection
 * Useful for debugging API credentials
 */
export async function testWhatsAppConnection(): Promise<boolean> {
  if (ACCESS_TOKEN === "YOUR_ACCESS_TOKEN_HERE" || PHONE_NUMBER_ID === "YOUR_PHONE_NUMBER_ID_HERE") {
    console.warn("⚠️  WhatsApp API credentials not configured. Using placeholders.");
    return false;
  }

  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    console.log("✅ WhatsApp API connection successful");
    return response.status === 200;
  } catch (error) {
    console.error("❌ WhatsApp API connection failed:", error);
    return false;
  }
}
