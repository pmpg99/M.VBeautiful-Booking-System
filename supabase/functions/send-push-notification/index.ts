import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  bookingId?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

// Generate VAPID JWT for Web Push
async function generateVapidJwt(endpoint: string, vapidPrivateKey: string, vapidPublicKey: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: "mailto:admin@mvbeautiful.pt"
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Send push notification to a single subscription
async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const jwt = await generateVapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey);
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "TTL": "86400",
        "Content-Encoding": "aes128gcm",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}: ${response.status} - ${errorText}`);
      
      // If subscription is invalid, we should remove it
      if (response.status === 404 || response.status === 410) {
        return { success: false, error: "subscription_expired" };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return { success: false, error: String(error) };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    
    const { user_id, client_phone, payload } = body as {
      user_id?: string;
      client_phone?: string;
      payload: PushPayload;
    };

    if (!payload || !payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Missing payload with title and body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subscriptions: PushSubscription[] = [];

    if (user_id) {
      // Send to specific user
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (error) {
        console.error("Error fetching subscriptions:", error);
        throw error;
      }
      subscriptions = data || [];
    } else if (client_phone) {
      // Find user_id from client phone and send to them
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("user_id")
        .eq("phone", client_phone)
        .not("user_id", "is", null)
        .single();

      if (clientError || !clientData?.user_id) {
        console.log("No registered user found for phone:", client_phone);
        return new Response(
          JSON.stringify({ message: "No push subscription for this client" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", clientData.user_id);

      if (error) throw error;
      subscriptions = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Must provide user_id or client_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending push to ${subscriptions.length} subscription(s)`);

    const results = await Promise.all(
      subscriptions.map(sub => sendPushToSubscription(sub, payload, vapidPrivateKey, vapidPublicKey))
    );

    // Remove expired subscriptions
    const expiredSubscriptions = subscriptions.filter((_, i) => 
      results[i].error === "subscription_expired"
    );
    
    if (expiredSubscriptions.length > 0) {
      for (const sub of expiredSubscriptions) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      console.log(`Removed ${expiredSubscriptions.length} expired subscription(s)`);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
