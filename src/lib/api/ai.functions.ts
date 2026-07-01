import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import process from "node:process";

export const queryMakaanBookAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      prompt: z.string().min(1).max(1000, "Prompt must not exceed 1000 characters"),
      history: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(2000),
        })
      ).max(20, "History cannot exceed 20 messages"),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { prompt, history } = data;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        response: "MakaanBook AI is active but Gemini API key is missing. Please add GEMINI_API_KEY to your backend env variables.",
      };
    }

    try {
      // 1. Fetch landlord data
      const { data: houses } = await supabase.from("houses").select("*").eq("landlord_id", userId);
      const { data: rooms } = await supabase.from("rooms").select("*").eq("landlord_id", userId);
      const { data: tenants } = await supabase.from("tenants").select("*").eq("landlord_id", userId);
      const { data: rentRecords } = await supabase.from("rent_records").select("*").eq("landlord_id", userId).order("created_at", { ascending: false }).limit(25);
      const { data: electricityBills } = await supabase.from("electricity_bills").select("*").eq("landlord_id", userId).order("created_at", { ascending: false }).limit(25);

      // Build context containing buildings, tenant states, and electrical logs
      // 2. Build database context description
      const contextText = `
// Assistant settings: warm tone assistant instructing in Hinglish
You are MakaanBook AI, a smart assistant built to help Indian landlords manage properties, track rent collections, and calculate electricity bills.
Your tone must be warm, helpful, and professional, responding primarily in Hinglish (Hindi mixed with English) to make it easy for landlords to understand.

Here is the current real-time database state for this landlord:

Houses (Buildings):
${JSON.stringify(houses || [], null, 2)}

Rooms (Units):
${JSON.stringify(rooms || [], null, 2)}

Tenants (Current and past residents):
${JSON.stringify(tenants || [], null, 2)}

Recent Rent Records:
${JSON.stringify(rentRecords || [], null, 2)}

Recent Electricity Bills:
${JSON.stringify(electricityBills || [], null, 2)}

Please answer the user's query using the data above. Calculate sums, list names, check due dates, or explain bill splits when requested.
If a tenant has vacated, their 'is_active' field will be false, and they will no longer occupy a room, but their past records are kept.
If they ask about meter changes, note if 'is_meter_replaced' is true on any of the bills.
      `.trim();

      // 3. Format contents for Gemini
      const contents = [
        {
          role: "user",
          parts: [{ text: contextText }]
        },
        ...history.map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        })),
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ];

      // 4. Request Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contents }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      const answer = resData.candidates?.[0]?.content?.parts?.[0]?.text || "Mujhe khed hai, main aapka javaab nahi dhoondh paya.";

      return { response: answer };
    } catch (err: any) {
      console.error("Gemini AI Error:", err);
      const isDev = process.env.NODE_ENV === "development";
      const errorMsg = isDev ? (err.message || "Something went wrong") : "Something went wrong while communicating with the AI service.";
      return { response: `Error: ${errorMsg}` };
    }
  });
