import { NextRequest, NextResponse } from 'next/server';
import { TenantInfo } from './shared/types';

// In-memory cache
const tenantCache = new Map<string, { data: TenantInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Check cache
  const cached = tenantCache.get(domain);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch from API
  try {
    const apiUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
    const res = await fetch(
      `${apiUrl}/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;

    const tenant = await res.json();

    // Store in cache
    tenantCache.set(domain, { data: tenant, expiry: Date.now() + CACHE_TTL });

    return tenant;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(':3000', '').replace(':3002', '') || '';
  const pathname = request.nextUrl.pathname;

  // Exclude paths that don't need processing
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Redirect page doesn't need tenant identification (universal)
  if (pathname.startsWith('/redirect')) {
    return NextResponse.next();
  }

  const tenant = await getTenantByDomain(hostname);

  if (!tenant) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  // Inject tenant info into headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-config', JSON.stringify(tenant.config));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
