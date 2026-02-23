import { getAdminPhoneNumbers, getAllOrganizationsForDropdown } from "@/lib/queries/admin";
import { PhoneNumbersClient } from "./_components/phone-numbers-client";

export default async function AdminPhoneNumbersPage() {
  const [phoneNumbers, organizations] = await Promise.all([
    getAdminPhoneNumbers(),
    getAllOrganizationsForDropdown(),
  ]);

  return <PhoneNumbersClient phoneNumbers={phoneNumbers} organizations={organizations} />;
}
