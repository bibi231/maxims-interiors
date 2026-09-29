-- ============================================================
-- 002 — Blog / Journal posts (edited in Admin > Journal).
-- Safe to re-run (CREATE TABLE IF NOT EXISTS).
-- content is HTML produced by the admin editor and sanitised by the API
-- (sanitize-html allowlist) before it is stored.
-- ============================================================

CREATE TABLE IF NOT EXISTS `blog_posts` (
  `id`              CHAR(24)     NOT NULL,
  `title`           VARCHAR(255) NOT NULL,
  `slug`            VARCHAR(191) NOT NULL,
  `excerpt`         TEXT         NULL,
  `content`         MEDIUMTEXT   NULL,
  `cover_image`     TEXT         NULL,
  `tags`            JSON         NULL,
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'draft',
  `published_at`    DATETIME(3)  NULL,
  `seo_title`       VARCHAR(255) NULL,
  `seo_description` VARCHAR(500) NULL,
  `author_id`       CHAR(24)     NULL,
  `author_name`     VARCHAR(255) NULL,
  `reading_minutes` INT          NOT NULL DEFAULT 1,
  `created_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_slug` (`slug`),
  KEY `ix_blog_status_published` (`status`, `published_at`),
  KEY `ix_blog_author` (`author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
