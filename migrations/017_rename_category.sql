-- Migration 017: Rename Category
UPDATE categories SET name = 'Reference' WHERE name = 'Reference Books';
