-- ============================================================
-- 004 — Business address: No. 8 Oke Agbe Street, Garki 2, Abuja, FCT
-- Fill ONLY a missing address. Any existing address property is preserved,
-- including empty strings and JSON null (which may be intentional admin edits).
-- This cannot undo changes made by an older version of migration 004.
-- ============================================================

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `name`       VARCHAR(191) NOT NULL,
  `applied_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Never guess whether an existing address is a historical default or an edit.
UPDATE `settings`
   SET `value` = JSON_SET(COALESCE(`value`, JSON_OBJECT()), '$.address', 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT'),
       `updated_at` = CURRENT_TIMESTAMP(3)
 WHERE `key` = 'contact_info'
   AND (`value` IS NULL OR (JSON_TYPE(`value`) = 'OBJECT'
        AND JSON_CONTAINS_PATH(`value`, 'one', '$.address') = 0))
   AND NOT EXISTS (SELECT 1 FROM `schema_migrations` WHERE `name` = '004-site-address');

-- No contact_info row yet: create one (the API fills the other fields with defaults).
INSERT INTO `settings` (`id`, `key`, `value`)
SELECT '000000000000000000000004', 'contact_info', JSON_OBJECT('address', 'No. 8 Oke Agbe Street, Garki 2, Abuja, FCT', 'email', 'info@maximsinterior.com.ng')
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM `schema_migrations` WHERE `name` = '004-site-address')
   AND NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'contact_info');

INSERT IGNORE INTO `schema_migrations` (`name`) VALUES ('004-site-address');
