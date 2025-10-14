import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(payload, null, 2));

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract callback data
    const { Body } = payload;
    const { stkCallback } = Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

    console.log('Processing callback:', {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
    });

    // Find booking by checkout request ID
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single();

    if (fetchError || !bookings) {
      console.error('Booking not found for checkout request:', CheckoutRequestID);
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update booking status based on result code
    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = '';
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') {
            mpesaReceiptNumber = item.Value;
          } else if (item.Name === 'TransactionDate') {
            transactionDate = item.Value;
          } else if (item.Name === 'PhoneNumber') {
            phoneNumber = item.Value;
          }
        }
      }

      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          mpesa_receipt_number: mpesaReceiptNumber,
          payment_phone: phoneNumber,
          payment_date: new Date(transactionDate).toISOString(),
        })
        .eq('id', bookings.id);

      console.log(`Payment confirmed for booking ${bookings.id}. Receipt: ${mpesaReceiptNumber}`);
    } else {
      // Payment failed or cancelled
      await supabase
        .from('bookings')
        .update({
          status: 'payment_failed',
          payment_error: ResultDesc,
        })
        .eq('id', bookings.id);

      console.log(`Payment failed for booking ${bookings.id}. Reason: ${ResultDesc}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing M-Pesa callback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
