import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isValidAdminAuthorization } from '@/lib/admin-auth';

export function proxy(request: NextRequest) {
  if (!process.env.ANALYTICS_ADMIN_USER || !process.env.ANALYTICS_ADMIN_PASSWORD) {
    return new NextResponse('Analytics dashboard is not configured.', { status: 404 });
  }

  if (!isValidAdminAuthorization(request.headers.get('authorization'))) {
    return new NextResponse('Authentication required.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="GTC Demo Analytics", charset="UTF-8"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/analytics/:path*',
};
