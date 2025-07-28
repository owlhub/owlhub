import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from "@/lib/auth";
import { checkApiPermission } from "@/lib/api-permissions";

export async function GET(request: NextRequest) {
  // Get the session
  const session = await auth();

  // Check if the user has permission to access this API route
  const permissionCheck = await checkApiPermission(session, "/api/apps/guide", "GET");

  if (!permissionCheck.authorized) {
    console.log(`API Route: Permission denied for GET /api/apps/guide - ${permissionCheck.message}`);
    return NextResponse.json({
      error: permissionCheck.message
    }, { status: 403 });
  }

  try {
    // Get the guide path from the query parameters
    const { searchParams } = new URL(request.url);
    const guidePath = searchParams.get('path');

    if (!guidePath) {
      return NextResponse.json(
        { error: 'Guide path is required' },
        { status: 400 }
      );
    }

    // Sanitize the path to prevent directory traversal attacks
    const sanitizedPath = guidePath.replace(/\.\./g, '');

    // Ensure the path has a .md extension
    const pathWithExtension = sanitizedPath.endsWith('.md') ? sanitizedPath : `${sanitizedPath}.md`;

    // Construct the full path to the markdown file
    const fullPath = path.join(process.cwd(), 'docs', 'app-guides', pathWithExtension);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Read the file content
    let content = fs.readFileSync(fullPath, 'utf8');

    // Generate a random UUID using a method that works in both Node.js and Edge Runtime
    // Try to detect which environment we're in and use the appropriate method
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    // Replace any placeholder for External ID with the UUID
    content = content.replace(/{{EXTERNAL_ID}}/g, uuid);

    // Return the content
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching guide:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guide' },
      { status: 500 }
    );
  }
}
