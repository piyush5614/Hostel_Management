-- Migration: Add image columns to students and visitors tables
-- Date: 2026-03-03

-- Add profile image and parent images to students
ALTER TABLE students ADD COLUMN profile_image TEXT;
ALTER TABLE students ADD COLUMN parent_image_1 TEXT;
ALTER TABLE students ADD COLUMN parent_image_2 TEXT;

-- Add photo and vehicle_number to visitors
ALTER TABLE visitors ADD COLUMN photo TEXT;
ALTER TABLE visitors ADD COLUMN vehicle_number TEXT;
