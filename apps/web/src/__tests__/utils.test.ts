import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatDateTime, truncateText, generateRandomId } from '../lib/utils'

describe('Utility Functions', () => {
  describe('cn - class name merging', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-2', 'py-1', 'bg-slate-50')
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
      expect(result).toContain('bg-slate-50')
    })

    it('should handle conflicting tailwind classes', () => {
      const result = cn('px-2 px-4', 'bg-red-500 bg-blue-500')
      expect(result).toContain('px-4') // px-4 should take precedence
      expect(result).toContain('bg-blue-500') // bg-blue-500 should take precedence
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class', !isActive && 'inactive-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
      expect(result).not.toContain('inactive-class')
    })
  })

  describe('formatDate', () => {
    it('should format date string to locale date', () => {
      const result = formatDate('2026-03-22')
      expect(result).toMatch(/Mar/i)
      expect(result).toContain('22')
      expect(result).toContain('2026')
    })

    it('should format Date object to locale date', () => {
      const date = new Date('2026-03-22')
      const result = formatDate(date)
      expect(result).toMatch(/Mar/i)
      expect(result).toContain('22')
    })

    it('should handle different date formats', () => {
      const result1 = formatDate('2025-12-25')
      const result2 = formatDate('2026-01-01')
      expect(result1).not.toBe(result2)
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const result = formatDateTime('2026-03-22T14:30:00')
      expect(result).toMatch(/Mar/i)
      expect(result).toContain('22')
      expect(result).toMatch(/\d{1,2}:\d{2}/) // Should contain time
    })

    it('should include both date and time components', () => {
      const result = formatDateTime(new Date('2026-03-22T14:30:00'))
      expect(result.length).toBeGreaterThan(10) // Should be longer than just a date
    })
  })

  describe('truncateText', () => {
    it('should return text as-is if under max length', () => {
      const text = 'Hello'
      const result = truncateText(text, 10)
      expect(result).toBe('Hello')
    })

    it('should truncate text exceeding max length', () => {
      const text = 'This is a long text'
      const result = truncateText(text, 7)
      expect(result).toBe('This is...')
      expect(result.length).toBe(10)
    })

    it('should handle edge case with max length equal to text length', () => {
      const text = 'Hello'
      const result = truncateText(text, 5)
      expect(result).toBe('Hello')
    })

    it('should add ellipsis when truncating', () => {
      const result = truncateText('HelloWorld', 5)
      expect(result).toMatch(/\.\.\.$/)
    })
  })

  describe('generateRandomId', () => {
    it('should generate a random string', () => {
      const id = generateRandomId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate different IDs on each call', () => {
      const id1 = generateRandomId()
      const id2 = generateRandomId()
      const id3 = generateRandomId()
      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
    })

    it('should generate valid alphanumeric IDs', () => {
      const id = generateRandomId()
      expect(/^[a-z0-9]+$/.test(id)).toBe(true)
    })
  })
})
