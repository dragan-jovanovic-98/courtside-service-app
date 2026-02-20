import { getUserProfile, getNotificationPreferences } from "@/lib/queries/settings";
import { ProfileClient } from "./_components/profile-client";

export default async function ProfilePage() {
  const [profile, notifPrefs] = await Promise.all([
    getUserProfile(),
    getNotificationPreferences(),
  ]);

  return <ProfileClient profile={profile} notifPrefs={notifPrefs} />;
}
