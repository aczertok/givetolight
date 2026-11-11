import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// After logging in: staff go to the admin dashboard, everyone else to their ambassador page.
export default async function Go() {
  if (!(await currentUser())) redirect("/login");
  redirect((await isAdmin()) ? "/admin" : "/ambassador");
}
