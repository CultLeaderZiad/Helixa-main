import { NextRequest, NextResponse } from "next/server";
import { getSupabaseBypassClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = await getSupabaseBypassClient();

    // Insert into newsletter_subscribers, ignore if it already exists (conflict on unique constraint)
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: email.toLowerCase().trim() },
        { onConflict: "email", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[api/newsletter/subscribe] Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("[api/newsletter/subscribe] Server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
