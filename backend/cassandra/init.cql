-- ============================================================
-- LocalReview — Cassandra Schema
-- Keyspace uses NetworkTopologyStrategy with RF=2 (both nodes)
-- Run: cqlsh -f init.cql
-- ============================================================

CREATE KEYSPACE IF NOT EXISTS localreview
    WITH replication = {
        'class': 'NetworkTopologyStrategy',
        'datacenter1': 2
    }
    AND durable_writes = true;

USE localreview;

-- ──────────────────────────────────────────────────────────────
-- REVIEWS
-- ──────────────────────────────────────────────────────────────

-- Lookup by review UUID (single row, all fields)
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID,
    business_id     UUID,
    user_id         UUID,
    user_display_name TEXT,
    user_avatar_url TEXT,
    rating          INT,
    title           TEXT,
    body            TEXT,
    tags            LIST<TEXT>,
    photos          LIST<TEXT>,
    helpful_count   INT,
    helpful_by      SET<TEXT>,
    status          TEXT,
    owner_resp_text TEXT,
    owner_resp_at   TIMESTAMP,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    PRIMARY KEY (id)
);

-- List reviews for a business, sorted newest-first (most common query)
CREATE TABLE IF NOT EXISTS reviews_by_business (
    business_id     UUID,
    created_at      TIMESTAMP,
    id              UUID,
    user_id         UUID,
    user_display_name TEXT,
    user_avatar_url TEXT,
    rating          INT,
    title           TEXT,
    body            TEXT,
    tags            LIST<TEXT>,
    photos          LIST<TEXT>,
    helpful_count   INT,
    helpful_by      SET<TEXT>,
    status          TEXT,
    owner_resp_text TEXT,
    owner_resp_at   TIMESTAMP,
    updated_at      TIMESTAMP,
    PRIMARY KEY ((business_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

-- List reviews written by a user, sorted newest-first
CREATE TABLE IF NOT EXISTS reviews_by_user (
    user_id         UUID,
    created_at      TIMESTAMP,
    id              UUID,
    business_id     UUID,
    user_display_name TEXT,
    user_avatar_url TEXT,
    rating          INT,
    title           TEXT,
    body            TEXT,
    tags            LIST<TEXT>,
    photos          LIST<TEXT>,
    helpful_count   INT,
    helpful_by      SET<TEXT>,
    status          TEXT,
    owner_resp_text TEXT,
    owner_resp_at   TIMESTAMP,
    updated_at      TIMESTAMP,
    PRIMARY KEY ((user_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC);

-- ──────────────────────────────────────────────────────────────
-- COMMENTS
-- ──────────────────────────────────────────────────────────────

-- Lookup by comment UUID
CREATE TABLE IF NOT EXISTS comments (
    id                UUID,
    review_id         UUID,
    business_id       UUID,
    user_id           UUID,
    user_display_name TEXT,
    body              TEXT,
    parent_comment_id UUID,
    created_at        TIMESTAMP,
    updated_at        TIMESTAMP,
    PRIMARY KEY (id)
);

-- List comments for a review, sorted oldest-first (chronological thread)
CREATE TABLE IF NOT EXISTS comments_by_review (
    review_id         UUID,
    created_at        TIMESTAMP,
    id                UUID,
    business_id       UUID,
    user_id           UUID,
    user_display_name TEXT,
    body              TEXT,
    parent_comment_id UUID,
    updated_at        TIMESTAMP,
    PRIMARY KEY ((review_id), created_at, id)
) WITH CLUSTERING ORDER BY (created_at ASC, id ASC);
