import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Negotiator from 'negotiator';

const locales = ['en', 'ru'];
const defaultLocale = 'en'; // Reverted to 'en'
const LANG_COOKIE_NAME = 'NEXT_LOCALE';

// Get the locale from the request (either from cookie or Accept-Language header)
function getLocale(request: NextRequest): string {
  // 1. Try to get locale from cookie
  const cookieLocale = request.cookies.get(LANG_COOKIE_NAME)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. If no cookie, use Accept-Language header
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
  
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    locales
  );
  
  return languages.find((lang: string) => locales.includes(lang)) || defaultLocale;
}

export function middleware(request: NextRequest) {
  const currentLocale = getLocale(request);
  const response = NextResponse.next(); // Create a response object

  // Always set the locale cookie in the response if it's not already set or is different
  const cookieLocale = request.cookies.get(LANG_COOKIE_NAME)?.value;
  if (!cookieLocale || cookieLocale !== currentLocale) {
    response.cookies.set(LANG_COOKIE_NAME, currentLocale, {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
    });
  }

  // Add the locale to the response header for server components to read easily
  response.headers.set('x-locale', currentLocale);

  return response;
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
