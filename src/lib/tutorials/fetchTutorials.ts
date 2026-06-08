import { collection, getDocs, query } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { MC, mcTutorialsCollection } from '@/lib/mcCollections'
import type {
  McTutorial,
  McTutorialSection,
  McTutorialSectionWithTutorials,
} from '@/lib/tutorials/types'

async function fetchAllSections(db: Firestore) {
  const snap = await getDocs(query(collection(db, MC.tutorialSections)))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as McTutorialSection) }))
}

async function fetchSectionTutorials(db: Firestore, sectionId: string) {
  const snap = await getDocs(query(collection(db, mcTutorialsCollection(sectionId))))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as McTutorial) }))
}

function sortByOrder<T extends { order?: number; createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return (a.createdAt ?? 0) - (b.createdAt ?? 0)
  })
}

/** Todas las secciones con tutoriales (super admin). */
export async function fetchAllTutorialSections(db: Firestore): Promise<McTutorialSectionWithTutorials[]> {
  const sections = sortByOrder(await fetchAllSections(db))
  const result: McTutorialSectionWithTutorials[] = []

  for (const section of sections) {
    const tutorials = sortByOrder(await fetchSectionTutorials(db, section.id))
    result.push({ ...section, tutorials })
  }

  return result
}

/** Secciones con tutoriales visibles (vista de configuración). */
export async function fetchVisibleTutorialSections(db: Firestore): Promise<McTutorialSectionWithTutorials[]> {
  const all = await fetchAllTutorialSections(db)
  return all
    .map((section) => ({
      ...section,
      tutorials: section.tutorials.filter((t) => t.visible),
    }))
    .filter((section) => section.tutorials.length > 0)
}
