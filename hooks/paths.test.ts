import { expect, test } from 'claude-code/testing'

import { baseName, homeOf, lastTwo } from './paths'

test('Windows paths name their folder and file as POSIX ones do', () => {
  expect(baseName('C:\\Users\\gian\\proj')).toBe('proj')
  expect(baseName('C:\\Users\\gian\\proj\\')).toBe('proj')
  expect(baseName('\\\\srv\\share\\proj')).toBe('proj')
  expect(baseName('/home/kyso/meu-app')).toBe('meu-app')
  expect(baseName('/')).toBeUndefined()
  expect(lastTwo('C:\\a\\b\\c.ts')).toBe('b/c.ts')
  expect(lastTwo('/home/kyso/hooks/clawd.ts')).toBe('hooks/clawd.ts')
})

test('no HOME on Windows: the home folder is USERPROFILE', () => {
  expect(homeOf(undefined, 'C:\\Users\\gian')).toBe('C:\\Users\\gian')
  expect(homeOf('/home/kyso', 'C:\\Users\\gian')).toBe('/home/kyso')
  expect(homeOf('', undefined)).toBe('')
})
