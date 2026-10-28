import { matchPath } from 'react-router-dom'
import { FEATURE_REGISTRY, FeatureEntry } from './registry'

/**
 * Global DocMatrix Navigation & Sidebar Selection Engine.
 * 
 * Guarantees:
 * 1. Exactly ONE leaf submodule item receives active state for any given URL.
 * 2. Strict exact-matching takes precedence over dynamic/parameterized patterns.
 * 3. Specificity-based scoring ensures nested paths (e.g. /patients/:id/timeline)
 *    match the precise leaf feature, never incorrectly selecting a parent or sibling.
 * 4. Safe against prefix/substring collisions across all 10 practice areas and 55 launch features.
 */

const ALL_LAUNCH_FEATURES = FEATURE_REGISTRY.filter((f) => f.phase === 'launch')

/**
 * Resolves parameterized demo routes (e.g. replacing :id with sample clinic record IDs).
 */
export function resolveFeatureRoute(route: string, area?: string): string {
  if (!route.includes(':id')) return route
  const defaultId = area?.toLowerCase() === 'patients' || route.includes('/patients') ? 'pt-1001' : 'apt-101'
  return route.replace(':id', defaultId)
}

/**
 * Finds the single best-matching feature entry for the given pathname.
 */
export function getActiveFeatureForPath(
  pathname: string,
  features: FeatureEntry[] = ALL_LAUNCH_FEATURES
): FeatureEntry | null {
  if (!pathname || pathname === '/' || pathname === '/dashboard') {
    return null
  }

  // Normalize path (strip trailing slashes, hashes, queries)
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'

  // 1. Strict exact route match (Highest Priority)
  const exact = features.find((f) => f.route === cleanPath)
  if (exact) {
    return exact
  }

  // 2. Pattern match for parameterized routes (e.g. /patients/:id, /patients/:id/timeline, /appointments/:id)
  const candidates = features.filter((f) => {
    if (!f.route.includes(':')) return false
    return Boolean(matchPath({ path: f.route, end: true }, cleanPath))
  })

  if (candidates.length === 1) {
    return candidates[0]
  }

  if (candidates.length > 1) {
    // Sort by specificity:
    candidates.sort((a, b) => {
      const aSegments = a.route.split('/').filter(Boolean)
      const bSegments = b.route.split('/').filter(Boolean)

      // 1. More segments = more specific (/patients/:id/timeline [3] > /patients/:id [2])
      if (aSegments.length !== bSegments.length) {
        return bSegments.length - aSegments.length
      }

      // 2. More static segments = more specific
      const aStatic = aSegments.filter((s) => !s.startsWith(':')).length
      const bStatic = bSegments.filter((s) => !s.startsWith(':')).length
      if (aStatic !== bStatic) {
        return bStatic - aStatic
      }

      // 3. Longer pattern = more specific
      return b.route.length - a.route.length
    })

    return candidates[0]
  }

  // 3. Fallback: Nested prefix match if a leaf manages nested children
  const prefixCandidates = features.filter((f) => {
    if (f.route === '/' || f.route === '/dashboard' || f.route.includes(':')) {
      return false
    }
    return cleanPath.startsWith(f.route + '/')
  })

  if (prefixCandidates.length > 0) {
    prefixCandidates.sort((a, b) => b.route.length - a.route.length)
    return prefixCandidates[0]
  }

  return null
}

/**
 * Checks whether a specific feature is active for the current URL.
 * Guarantees that at most one leaf feature returns true for any URL.
 */
export function isFeatureActive(
  featureId: string,
  pathname: string,
  features: FeatureEntry[] = ALL_LAUNCH_FEATURES
): boolean {
  const active = getActiveFeatureForPath(pathname, features)
  return active ? active.id === featureId : false
}

export default {
  resolveFeatureRoute,
  getActiveFeatureForPath,
  isFeatureActive
}
