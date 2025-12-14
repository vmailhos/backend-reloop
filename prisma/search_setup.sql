-- ============================================================
-- SEARCH SETUP FOR RELOOP MARKETPLACE
-- Full Text Search + Trigram Fuzzy Search for Listing model
-- Compatible with Prisma + PostgreSQL
-- ============================================================

-- 1) EXTENSIONS ------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- 2) IMMUTABLE UNACCENT WRAPPER (needed for trigram indexes) --
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
AS $$
  SELECT unaccent($1);
$$ LANGUAGE SQL IMMUTABLE;


-- 3) ADD SEARCH VECTOR COLUMN ---------------------------------
ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS search_vector tsvector;


-- 4) INITIAL POPULATION OF search_vector -----------------------
UPDATE "Listing"
SET search_vector = to_tsvector(
  'spanish',
  immutable_unaccent(
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(brand, '') || ' ' ||
    coalesce(color, '')
  )
);


-- 5) TRIGGER FUNCTION FOR KEEPING VECTOR UPDATED ---------------
CREATE OR REPLACE FUNCTION listing_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'spanish',
    immutable_unaccent(
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.brand, '') || ' ' ||
      coalesce(NEW.color, '')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 6) ATTACH TRIGGER TO LISTING TABLE ---------------------------
DROP TRIGGER IF EXISTS listing_search_update ON "Listing";

CREATE TRIGGER listing_search_update
BEFORE INSERT OR UPDATE ON "Listing"
FOR EACH ROW EXECUTE FUNCTION listing_search_trigger();


-- 7) FULL TEXT SEARCH INDEX ------------------------------------
CREATE INDEX IF NOT EXISTS listing_search_idx
ON "Listing" USING GIN (search_vector);


-- 8) FUZZY SEARCH TRIGRAM INDEX --------------------------------
CREATE INDEX IF NOT EXISTS listing_title_trgm_idx
ON "Listing" USING GIN (immutable_unaccent(title) gin_trgm_ops);


-- ============================================================
-- DONE. Your database now supports full-text + fuzzy search.
-- ============================================================
