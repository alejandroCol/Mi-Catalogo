import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export async function showroomJoinWaitlist(input: {
  slug: string
  email: string
  name?: string
}): Promise<{ ok: true; alreadyJoined?: boolean; id?: string }> {
  const fn = httpsCallable<
    { slug: string; email: string; name?: string },
    { ok: true; alreadyJoined?: boolean; id?: string }
  >(getFirebaseFunctions(), 'mcShowroomJoinWaitlist')
  const res = await fn(input)
  return res.data
}
