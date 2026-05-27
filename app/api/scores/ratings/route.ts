import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/client";

function isAdminRole(role?: string | null): boolean {
  return role?.toLowerCase() === "admin";
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const ratingId = body.ratingId;
    const star = Number(body.star);
    const userRole = body.userRole || request.headers.get("x-user-role");

    if (!isAdminRole(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Admin role required" },
        { status: 403 },
      );
    }

    if (!ratingId || !Number.isInteger(star) || star < 1 || star > 5) {
      return NextResponse.json(
        { ok: false, error: "ratingId and star 1-5 are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ratings")
      .update({ star })
      .eq("id", ratingId)
      .select("id, star")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, rating: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const ratingId = body.ratingId;
    const userRole = body.userRole || request.headers.get("x-user-role");

    if (!isAdminRole(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Admin role required" },
        { status: 403 },
      );
    }

    if (!ratingId) {
      return NextResponse.json(
        { ok: false, error: "ratingId is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("ratings")
      .delete()
      .eq("id", ratingId)
      .select("id, star")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, rating: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
