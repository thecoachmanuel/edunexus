import { redirect } from "next/navigation";

export default function SuperAdminRoot() {
  redirect("/saas-admin/login");
}
