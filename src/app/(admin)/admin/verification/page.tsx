import { getAdminVerifications } from "@/lib/queries/admin";
import { VerificationClient } from "./_components/verification-client";

export default async function AdminVerificationPage() {
  const verifications = await getAdminVerifications();

  return <VerificationClient verifications={verifications} />;
}
