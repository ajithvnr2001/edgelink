/**
 * URL Redirect Handler
 * Based on PRD FR-2: Link Redirect
 */

import type { Env, LinkKVValue, AnalyticsEvent } from '../types';
import { verifyPassword } from '../utils/password';

/**
 * Handle GET /{slug}
 * Redirect to destination URL
 *
 * FR-2: Link Redirect
 * FR-2.1: HTTP 301 redirects (permanent, default)
 * FR-2.3: Redirect latency <50ms p95
 */
export async function handleRedirect(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  try {
    // Get link data from KV (fast path)
    const linkDataStr = await env.LINKS_KV.get(`slug:${slug}`);

    if (!linkDataStr) {
      // Link not found
      return new Response('Link not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const linkData: LinkKVValue = JSON.parse(linkDataStr);

    // Check time-based expiration
    if (linkData.expires_at && Date.now() > linkData.expires_at) {
      return new Response('Link expired', {
        status: 410,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Check click-count expiration (max_clicks)
    if (linkData.max_clicks && linkData.click_count >= linkData.max_clicks) {
      return new Response('Link has reached maximum click limit', {
        status: 410,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Check password protection (Pro feature)
    if (linkData.password_hash) {
      const password = request.headers.get('X-Link-Password');
      if (!password || !(await verifyPassword(password, linkData.password_hash))) {
        return new Response(
          JSON.stringify({
            error: 'Password required',
            code: 'PASSWORD_REQUIRED'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Determine destination based on routing rules
    let destination = linkData.destination;

    // Device-based routing (FR-9)
    if (linkData.device_routing) {
      const userAgent = request.headers.get('user-agent') || '';
      const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
      const isTablet = /iPad|Tablet/i.test(userAgent);

      if (isMobile && linkData.device_routing.mobile) {
        destination = linkData.device_routing.mobile;
      } else if (isTablet && linkData.device_routing.tablet) {
        destination = linkData.device_routing.tablet;
      } else if (!isMobile && !isTablet && linkData.device_routing.desktop) {
        destination = linkData.device_routing.desktop;
      }
    }

    // Geographic routing (FR-10)
    if (linkData.geo_routing) {
      const country = request.headers.get('cf-ipcountry') || 'XX';
      if (linkData.geo_routing[country]) {
        destination = linkData.geo_routing[country];
      }
    }

    // Referrer-based routing (FR-11)
    if (linkData.referrer_routing) {
      const referrer = request.headers.get('referer') || '';
      for (const [domain, url] of Object.entries(linkData.referrer_routing)) {
        if (referrer.includes(domain)) {
          destination = url;
          break;
        }
      }
    }

    // A/B testing (FR-14)
    if (linkData.ab_testing) {
      // Use IP hash for deterministic assignment
      const ip = request.headers.get('cf-connecting-ip') || '';
      const hash = await hashString(ip);
      destination = hash % 2 === 0
        ? linkData.ab_testing.variant_a
        : linkData.ab_testing.variant_b;
    }

    // Append UTM parameters (FR-12)
    if (linkData.utm_template) {
      const url = new URL(destination);
      const params = new URLSearchParams(linkData.utm_template);
      params.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
      destination = url.toString();
    }

    // Track analytics (async, don't block redirect)
    trackAnalytics(env, slug, request, linkData).catch(err =>
      console.error('Analytics tracking failed:', err)
    );

    // Increment click count (async)
    incrementClickCount(env, slug, linkData.user_id).catch(err =>
      console.error('Click count increment failed:', err)
    );

    // Return redirect (FR-2.1: 301 permanent)
    return Response.redirect(destination, 301);
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Track analytics event
 * FR-3: Analytics Foundation
 */
async function trackAnalytics(
  env: Env,
  slug: string,
  request: Request,
  linkData: LinkKVValue
): Promise<void> {
  const userAgent = request.headers.get('user-agent') || '';
  const country = request.headers.get('cf-ipcountry') || 'XX';
  const city = request.headers.get('cf-ipcity') || '';
  const referrer = request.headers.get('referer') || 'direct';

  // Parse device info
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Parse browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Parse OS
  let os = 'unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Write to Analytics Engine
  const event: AnalyticsEvent = {
    timestamp: Date.now(),
    slug,
    country,
    city,
    device,
    browser,
    os,
    referrer,
    user_id: linkData.user_id,
    plan: undefined // We'd need to fetch this from DB
  };

  await env.ANALYTICS_ENGINE.writeDataPoint({
    indexes: [slug, country, device],
    blobs: [referrer, browser, os],
    doubles: [Date.now()]
  });
}

/**
 * Increment click count
 */
async function incrementClickCount(
  env: Env,
  slug: string,
  userId: string
): Promise<void> {
  if (userId === 'anonymous') {
    await env.DB.prepare(`
      UPDATE anonymous_links
      SET click_count = click_count + 1
      WHERE slug = ?
    `).bind(slug).run();
  } else {
    await env.DB.prepare(`
      UPDATE links
      SET click_count = click_count + 1
      WHERE slug = ?
    `).bind(slug).run();
  }
}

/**
 * Hash string for consistent A/B testing
 */
async function hashString(input: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return hashArray[0];
}
