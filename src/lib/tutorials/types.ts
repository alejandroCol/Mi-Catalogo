export interface McTutorial {
  title: string
  description: string
  /** URL de YouTube o Vimeo (watch, share o embed). */
  videoUrl: string
  visible: boolean
  order: number
  createdAt: number
  updatedAt: number
}

export interface McTutorialSection {
  title: string
  order: number
  createdAt: number
  updatedAt: number
}

export type McTutorialWithId = McTutorial & { id: string }
export type McTutorialSectionWithId = McTutorialSection & { id: string }

export type McTutorialSectionWithTutorials = McTutorialSectionWithId & {
  tutorials: McTutorialWithId[]
}
