// Minimal shared types & helpers

// Example branded type helper for stronger nominal typing
export type Brand<T, K extends string> = T & { readonly __brand: K }

// Domain type exports
export type { CharacterProfile, SettingProfile } from './schemas.js'
export { CharacterProfileSchema, SettingProfileSchema } from './schemas.js'

// Placeholder constant to validate exports
export const version = '0.0.0'
