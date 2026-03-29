/*
  # Add hex color support to tags table

  ## Summary
  Adds a `color` column to the tags table to store a hex color value for each tag,
  enabling a full color picker rather than just the limited preset color keys.

  ## Modified Tables

  ### tags
  - Added `color` (text, default '#3B82F6') - hex color string for the tag

  ## Notes
  - Existing tags will default to the blue hex value
  - The color_key column is kept for backwards compatibility but color (hex) takes precedence
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'color'
  ) THEN
    ALTER TABLE tags ADD COLUMN color text NOT NULL DEFAULT '#3B82F6';
  END IF;
END $$;
