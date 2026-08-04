import type { ViewsConfig } from '@/types'

// The Firebase project id is not a secret, it is visible in any client request.
// Access is constrained by Firestore rules, see docs/firestore.rules.
export const views: ViewsConfig = {
  enabled: true,
  projectId: 'blog-b6d9f',
  collection: 'views',
}
