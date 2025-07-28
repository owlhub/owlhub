import {useSession} from "next-auth/react";
import { useRouter } from "next/navigation";
import IntegrationFindingDetails from "./IntegrationFindingDetails";

export default async function PostureFindingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/login?redirect=/casb/overview'),
  });

  // Get the finding ID from params
  const { id } = await params;

  // Pass the ID to the client component which will handle the data fetching
  return <IntegrationFindingDetails id={id} />;
}
