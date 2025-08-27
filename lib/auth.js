import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Create Supabase client for server-side operations
 */
function createSupabaseServerClient(request) {
  return createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.headers.get('cookie')?.split(';')
            .find(c => c.trim().startsWith(`${name}=`))?.split('=')[1]
        },
        set() {
          // Server-side cookie setting not needed for this use case
        },
        remove() {
          // Server-side cookie removal not needed for this use case
        }
      }
    }
  )
}

/**
 * Require authenticated user for API routes
 * @param {Request} request - Next.js request object
 * @returns {Promise<{user: Object, error: NextResponse|null}>}
 */
export async function requireUser(request) {
  try {
    const supabase = createSupabaseServerClient(request)
    
    // Get user from session
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Auth error:', error.message)
      return {
        user: null,
        error: NextResponse.json(
          { error: { type: 'Auth', message: 'Authentication failed' } },
          { status: 401 }
        )
      }
    }
    
    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: { type: 'Auth', message: 'Authentication required' } },
          { status: 401 }
        )
      }
    }
    
    return { user, error: null }
  } catch (err) {
    console.error('RequireUser error:', err)
    return {
      user: null,
      error: NextResponse.json(
        { error: { type: 'Auth', message: 'Authentication error' } },
        { status: 500 }
      )
    }
  }
}

/**
 * Verify user owns the resource (userId match)
 * @param {string} userId - User ID from request
 * @param {string} authenticatedUserId - Authenticated user ID
 * @returns {boolean}
 */
export function verifyOwnership(userId, authenticatedUserId) {
  return userId === authenticatedUserId
}

/**
 * Return 403 error for ownership violation
 */
export function ownershipError() {
  return NextResponse.json(
    { error: { type: 'Authorization', message: 'Access denied: resource not owned by user' } },
    { status: 403 }
  )
}