-- ============================================================
-- 004 — Business address: No. 8 Oke Agbe Street, Garki 2, Abuja
-- One-time data change, recorded in schema_migrations so re-running
-- `npm run db:schema` never overwrites an address staff edit later in
-- Admin > Settings > Contact & Address.
-- ============================================================

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `name`       VARCHAR(191) NOT NULL,
  `applied_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing contact_info row: set the address (other fields untouched).
UPDATE `settings`
   SET `value` = JSON_SET(COALESCE(`value`, JSON_OBJECT()), '$.address', 'No. 8 Oke Agbe Street, Garki 2, Abuja'),
       `updated_at` = CURRENT_TIMESTAMP(3)
 WHERE `key` = 'contact_info'
   AND NOT EXISTS (SELECT 1 FROM `schema_migrations` WHERE `name` = '004-site-address');

-- No contact_info row yet: create one (the API fills the other fields with defaults).
INSERT IGNORE INTO `settings` (`id`, `key`, `value`)
SELECT '000000000000000000000004', 'contact_info', JSON_OBJECT('address', 'No. 8 Oke Agbe Street, Garki 2, Abuja', 'email', 'info@maximsinterior.com.ng')
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM `schema_migrations` WHERE `name` = '004-site-address');

INSERT IGNORE INTO `schema_migrations` (`name`) VALUES ('004-site-address');
