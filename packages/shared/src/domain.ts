// Domain types for shared usage across API and Web

/**
 * Character profile used to define in-world personas.
 * Fields are readonly to encourage immutability across consumers.
 */
export type CharacterProfile = {
  readonly id: string
  readonly name: string
  readonly summary: string
  readonly backstory: string
  readonly personality: string
  readonly goals: ReadonlyArray<string>
  readonly speakingStyle: string
  readonly tags?: ReadonlyArray<string>
}

/**
 * Setting profile describing the world/context the story takes place in.
 */
export type SettingProfile = {
  readonly id: string
  readonly name: string
  readonly lore: string
  readonly tone: string
  readonly constraints?: ReadonlyArray<string>
}
