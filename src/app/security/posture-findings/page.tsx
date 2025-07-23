import { auth } from "@/lib/auth";
import ClientWrapper from "./ClientWrapper";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function PostureFindingsPage() {
  const session = await auth().catch(error => {
    console.error("Auth error:", error);
    return null;
  });

  // Check if the user is authenticated
  if (!session?.user) {
    // Redirect to home page with the current URL as a parameter
    redirect("/login?redirect=/security/posture-findings");
  }

  // Get the host from headers for constructing the API URL
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  // Fetch findings from the API endpoint
  const response = await fetch(`${protocol}://${host}/api/security/posture-findings?mode=summary`, {
    headers: {
      'Cookie': headersList.get('cookie') || '',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch findings: ${response.statusText}`);
  }

  const data = await response.json();

  // Extract findings and integrations from the API response
  const { findings: formattedFindings, integrations: uniqueIntegrations } = data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Posture Findings</h1>
        </div>
      </header>

      <p className="mb-4">Review and take action against security issues found in your application or cloud</p>

      <ClientWrapper findings={formattedFindings} integrations={uniqueIntegrations} />
    </div>
  );
}
