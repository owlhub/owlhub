import {redirect} from "next/navigation";
import IntegrationFindingDetails from "./IntegrationFindingDetails";
import {auth} from "@/lib/auth";

export default async function PostureFindingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect(`/?redirect=/casb/posture-findings`);
  }

  // Get the finding ID from params
  const { id } = await params;

  // Pass the ID to the client component which will handle the data fetching
  return <IntegrationFindingDetails id={id} />;
}
