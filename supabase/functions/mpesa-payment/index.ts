import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa credentials from secrets
const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY');
const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET');
const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE');
const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY');
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke';

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getOAuthToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  
  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get OAuth token');
  }

  const data = await response.json();
  return data.access_token;
}

async function initiateSTKPush(
  accessToken: string,
  phoneNumber: string,
  amount: number,
  bookingId: string
): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`);

  // Format phone number to 254 format (remove leading 0 or +)
  let formattedPhone = phoneNumber.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('+254')) {
    formattedPhone = formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('254')) {
    formattedPhone = '254' + formattedPhone;
  }

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: formattedPhone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: `${supabaseUrl}/functions/v1/mpesa-callback`,
    AccountReference: bookingId,
    TransactionDesc: `Water Tanker Booking ${bookingId}`,
  };

  console.log('STK Push payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('M-Pesa API error:', errorText);
    throw new Error(`M-Pesa API error: ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, phoneNumber, amount } = await req.json();

    console.log('Processing payment request:', { bookingId, phoneNumber, amount });

    if (!bookingId || !phoneNumber || !amount) {
      throw new Error('Missing required fields: bookingId, phoneNumber, or amount');
    }

    // Get OAuth token
    const accessToken = await getOAuthToken();
    console.log('OAuth token obtained successfully');

    // Initiate STK Push
    const stkResponse = await initiateSTKPush(accessToken, phoneNumber, amount, bookingId);
    console.log('STK Push response:', JSON.stringify(stkResponse, null, 2));

    // Update booking with checkout request ID
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (stkResponse.ResponseCode === '0') {
      await supabase
        .from('bookings')
        .update({ 
          status: 'payment_initiated',
          checkout_request_id: stkResponse.CheckoutRequestID 
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment request sent. Please check your phone.',
          checkoutRequestId: stkResponse.CheckoutRequestID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(stkResponse.ResponseDescription || 'Payment initiation failed');
    }
  } catch (error: any) {
    console.error('Error in mpesa-payment function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Payment processing failed' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
