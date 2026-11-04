import { createContext, useContext } from 'react'
export const ProfileSavedContext = createContext<(() => void) | null>(null)
export function useProfileSaved() {
  return useContext(ProfileSavedContext)
}
