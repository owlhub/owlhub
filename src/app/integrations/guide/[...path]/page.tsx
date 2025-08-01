"use client";

import { useEffect, useState } from 'react';
import {useSession} from "next-auth/react";
import {useParams, useRouter} from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';

// Define custom props interface for the code component
interface CodeComponentProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function GuidePage() {
  const router = useRouter();

  const { status } = useSession({
    required: true,
    onUnauthenticated: () => router.push('/login?redirect=/integrations/new'),
  });
  const params = useParams();
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Construct the path from the route params
  const guidePath = Array.isArray(params.path) ? params.path.join('/') : params.path;

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/apps/guide?path=${guidePath}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch guide: ${response.statusText}`);
        }

        const data = await response.json();
        setMarkdown(data.content);
      } catch (err) {
        console.error('Error fetching markdown:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching the guide');
      } finally {
        setLoading(false);
      }
    };

    if (guidePath) {
      fetchMarkdown();
    }
  }, [guidePath]);

  if (status === "loading") {
    return (
       <></>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Link href="/integrations" className="text-blue-500 hover:underline mr-2">
            ← Back to Integrations
          </Link>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-4">
          <Link href="/integrations" className="text-blue-500 hover:underline mr-2">
            ← Back to Integrations
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Link href="/integrations" className="text-blue-500 hover:underline mr-2">
          ← Back to Integrations
        </Link>
      </div>

      <div className="prose max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({...props}) => <a {...props} className="text-blue-500 hover:underline" />,
            h1: ({...props}) => <h1 {...props} className="text-3xl font-bold mt-8 mb-4" />,
            h2: ({...props}) => <h2 {...props} className="text-2xl font-bold mt-6 mb-3" />,
            h3: ({...props}) => <h3 {...props} className="text-xl font-bold mt-4 mb-2" />,
            ul: ({...props}) => <ul {...props} className="list-disc pl-6 mb-4" />,
            ol: ({...props}) => <ol {...props} className="list-decimal pl-6 mb-4" />,
            li: ({...props}) => <li {...props} className="mb-1" />,
            p: ({...props}) => <p {...props} className="mb-4" />,
            code: ({inline, ...props}: CodeComponentProps) => 
              inline ? <code {...props} className="bg-gray-100 px-1 py-0.5 rounded text-sm" /> 
                     : <code {...props} className="block bg-gray-100 p-4 rounded text-sm overflow-x-auto" />
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
