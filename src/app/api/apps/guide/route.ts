import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
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

    // Generate a random UUID
    const uuid = crypto.randomUUID();

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
