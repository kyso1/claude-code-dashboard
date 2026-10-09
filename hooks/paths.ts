// Paths and the home folder on every system the engine runs on: Windows hands
// paths with '\' (a folder may end in one, a share starts with two) and may
// have no HOME, only USERPROFILE.

export const homeOf = (home: string | undefined, profile: string | undefined): string => home || profile || ''

const parts = (p: string) => p.split(/[\\/]/).filter(Boolean)
export const baseName = (p: string): string | undefined => parts(p).at(-1)
export const lastTwo = (p: string): string => parts(p).slice(-2).join('/')
