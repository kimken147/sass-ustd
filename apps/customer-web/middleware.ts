import { NextRequest, NextResponse } from 'next/server';
import { TenantInfo } from './shared/types';

// In-memory cache
const tenantCache = new Map<string, { data: TenantInfo; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Check cache
  const cacheKey = `domain:${domain}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch from API
  try {
    const apiUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
    const res = await fetch(
      `${apiUrl}/api/tenants/by-domain/${encodeURIComponent(domain)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;

    const response = await res.json();
    // Handle wrapped API response { success: true, data: TenantResponseDto }
    const apiResponse = response.data || response;

    // Transform API response (TenantResponseDto) to TenantInfo
    const tenant: TenantInfo = {
      slug: apiResponse.slug,
      name: apiResponse.name,
      config: {
        investmentContractAddress: apiResponse.cryptoConfig?.investmentContractAddress || '',
        usdtTokenAddress: apiResponse.cryptoConfig?.usdtTokenAddress || '',
        branding: apiResponse.branding,
      },
    };

    // Store in cache
    tenantCache.set(cacheKey, { data: tenant, expiry: Date.now() + CACHE_TTL });

    return tenant;
  } catch {
    return null;
  }
}

async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  // Check cache
  const cacheKey = `slug:${slug}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Fetch from API
  try {
    const apiUrl = process.env.PLATFORM_API_URL || 'http://localhost:3000';
    const res = await fetch(
      `${apiUrl}/api/tenants/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) return null;

    const response = await res.json();
    // Handle wrapped API response { success: true, data: TenantResponseDto }
    const apiResponse = response.data || response;

    // Transform API response (TenantResponseDto) to TenantInfo
    const tenant: TenantInfo = {
      slug: apiResponse.slug,
      name: apiResponse.name,
      config: {
        investmentContractAddress: apiResponse.cryptoConfig?.investmentContractAddress || '',
        usdtTokenAddress: apiResponse.cryptoConfig?.usdtTokenAddress || '',
        branding: apiResponse.branding,
      },
    };

    // Store in cache
    tenantCache.set(cacheKey, { data: tenant, expiry: Date.now() + CACHE_TTL });

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

  let tenant: TenantInfo | null = null;
  let rewritePath = pathname;

  // Strategy 1: Path-based routing (for development or multi-tenant on single domain)
  // URL format: /tenant-slug/... (e.g., /test002/success)
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    const potentialSlug = pathSegments[0];
    // Try to get tenant by slug from path
    tenant = await getTenantBySlug(potentialSlug);

    if (tenant) {
      // Remove tenant slug from path for internal routing
      // /test002 -> / (root)
      // /test002/success -> /success
      rewritePath = '/' + pathSegments.slice(1).join('/') || '/';
    }
  }

  // Strategy 2: Domain-based routing (for production with custom domains)
  // Only try if path-based didn't find a tenant and hostname is not localhost
  if (!tenant && hostname !== 'localhost') {
    tenant = await getTenantByDomain(hostname);
  }

  if (!tenant) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  // Inject tenant info into headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant.slug);
  requestHeaders.set('x-tenant-config', JSON.stringify(tenant.config));

  // Rewrite to internal path (without tenant slug prefix)
  if (rewritePath !== pathname) {
    const url = new URL(rewritePath, request.url);
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
