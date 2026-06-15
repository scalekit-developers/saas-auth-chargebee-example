/**
 * OAuth callback page - redirects to API route for processing
 * Cookies can only be modified in Route Handlers, so we forward to the API route
 */
import { redirect } from 'next/navigation';

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Build query string from searchParams
  const queryParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else {
        queryParams.append(key, value);
      }
    }
  });
  
  // Redirect to the API route which can modify cookies
  // Use relative path - Next.js will handle the full URL
  const queryString = queryParams.toString();
  redirect(`/api/auth/callback${queryString ? `?${queryString}` : ''}`);
}

