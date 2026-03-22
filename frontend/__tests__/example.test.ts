import { describe, it, expect } from 'vitest'

describe('Frontend Tests - Example', () => {
  it('should demonstrate a passing test', () => {
    expect(true).toBe(true)
  })

  it('should show basic arithmetic', () => {
    const sum = 1 + 2
    expect(sum).toBe(3)
  })
})
