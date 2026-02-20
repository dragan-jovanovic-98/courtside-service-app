import { getVerification } from "@/lib/queries/settings";
import { VerificationClient } from "./_components/verification-client";

export default async function VerificationPage() {
  const verification = await getVerification();
  return <VerificationClient verification={verification} />;
}
