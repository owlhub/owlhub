import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to promise-based
const execPromise = promisify(exec);

export async function GET() {
  try {
    console.log('Starting security scan from API endpoint');

    // Execute the fetchSecurityFindings script using ts-node
    const { stdout, stderr } = await execPromise(
      'npx ts-node -P tsconfig.scripts.json scripts/fetchSecurityFindings.ts'
    );

    if (stderr) {
      console.error('Script stderr:', stderr);
    }

    console.log('Script stdout:', stdout);
    console.log('Security scan completed successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Security scan completed successfully',
      details: stdout
    });
  } catch (error) {
    console.error('Error running security scan:', error);

    return NextResponse.json(
      { 
        success: false, 
        message: 'Error running security scan', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
