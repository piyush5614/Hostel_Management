import { describe, it, expect } from 'vitest'

describe('Backend Tests - Example', () => {
  it('should demonstrate a passing test', () => {
    expect(true).toBe(true)
  })

  it('should show basic math', () => {
    const result = 5 * 2
    expect(result).toBe(10)
  })
})
