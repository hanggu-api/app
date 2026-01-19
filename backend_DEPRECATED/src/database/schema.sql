SET FOREIGN_KEY_CHECKS = 0;

-- Table: ai_training_examples
CREATE TABLE IF NOT EXISTS `ai_training_examples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profession_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `text` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `profession_id` (`profession_id`),
  KEY `category_id` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16134 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: auth_users
CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('client','provider') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `type` enum('text','image','audio','location','video') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: conversations
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `request_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cp` (`client_id`,`provider_id`),
  KEY `idx_req` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: locations
CREATE TABLE IF NOT EXISTS `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: messages
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` int NOT NULL,
  `sender` enum('client','provider') NOT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `seen_by_user_at` timestamp NULL DEFAULT NULL,
  `seen_by_provider_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: mission_media
CREATE TABLE IF NOT EXISTS `mission_media` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mission_id` int NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(16) NOT NULL,
  `s3_key` varchar(512) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mission` (`mission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: missions
CREATE TABLE IF NOT EXISTS `missions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `location` varchar(255) DEFAULT NULL,
  `lat` decimal(9,6) DEFAULT NULL,
  `lng` decimal(9,6) DEFAULT NULL,
  `budget` decimal(10,2) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `provider_id` int DEFAULT NULL,
  `category` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  KEY `idx_category` (`category`),
  KEY `idx_geo` (`lat`,`lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: notification_devices
CREATE TABLE IF NOT EXISTS `notification_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(256) NOT NULL,
  `platform` varchar(32) DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_token` (`user_id`,`token`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: notification_prefs
CREATE TABLE IF NOT EXISTS `notification_prefs` (
  `user_id` int NOT NULL,
  `allow_payment` tinyint NOT NULL DEFAULT '1',
  `allow_mission` tinyint NOT NULL DEFAULT '1',
  `allow_chat` tinyint NOT NULL DEFAULT '1',
  `allow_general` tinyint NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mission_id` varchar(36) NOT NULL,
  `proposal_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `provider_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'BRL',
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `payment_remaining_status` varchar(32) DEFAULT 'pending',
  `proof_photo` varchar(255) DEFAULT NULL,
  `proof_code` varchar(32) DEFAULT NULL,
  `mp_preference_id` varchar(64) DEFAULT NULL,
  `mp_payment_id` varchar(64) DEFAULT NULL,
  `external_ref` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `status_detail` varchar(64) DEFAULT NULL,
  `payment_method_id` varchar(32) DEFAULT NULL,
  `payer_email` varchar(255) DEFAULT NULL,
  `collector_id` varchar(32) DEFAULT NULL,
  `net_received` decimal(10,2) DEFAULT NULL,
  `fee_amount` decimal(10,2) DEFAULT NULL,
  `installments` int DEFAULT NULL,
  `card_last_four` varchar(8) DEFAULT NULL,
  `order_id` varchar(64) DEFAULT NULL,
  `refund_status` varchar(32) DEFAULT NULL,
  `refund_amount` decimal(10,2) DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `canceled_at` timestamp NULL DEFAULT NULL,
  `money_release_date` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_mission` (`mission_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_id` (`mp_payment_id`),
  KEY `idx_external` (`external_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: professions
CREATE TABLE IF NOT EXISTS `professions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL,
  `category_id` int DEFAULT NULL,
  `icon` varchar(64) DEFAULT NULL,
  `keywords` text,
  `search_vector` json DEFAULT NULL,
  `popularity_score` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_professions_name` (`name`),
  FULLTEXT KEY `name` (`name`,`keywords`),
  FULLTEXT KEY `ft_professions_name_keywords` (`name`,`keywords`)
) ENGINE=InnoDB AUTO_INCREMENT=3406 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: proposals
CREATE TABLE IF NOT EXISTS `proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mission_id` int NOT NULL,
  `user_id` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `deadline_days` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: provider_media
CREATE TABLE IF NOT EXISTS `provider_media` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `kind` varchar(16) NOT NULL,
  `s3_key` varchar(512) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: provider_penalties
CREATE TABLE IF NOT EXISTS `provider_penalties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `request_id` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: provider_professions
CREATE TABLE IF NOT EXISTS `provider_professions` (
  `provider_user_id` bigint NOT NULL,
  `profession_id` int NOT NULL,
  `fixed_price` decimal(10,2) DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`provider_user_id`,`profession_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: providers
CREATE TABLE IF NOT EXISTS `providers` (
  `user_id` bigint NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `rating_avg` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `wallet_balance` decimal(10,2) DEFAULT '0.00',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT '0',
  `document_type` enum('cpf','cnpj') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_value` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commercial_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `idx_providers_document` (`document_value`),
  CONSTRAINT `providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mission_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `rater_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text,
  `status` varchar(16) NOT NULL DEFAULT 'published',
  `moderated` tinyint NOT NULL DEFAULT '0',
  `abuse_flags` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mission_rater` (`mission_id`,`rater_id`),
  KEY `idx_provider` (`provider_id`),
  KEY `idx_mission` (`mission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: service_categories
CREATE TABLE IF NOT EXISTS `service_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_slug` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_conversations
CREATE TABLE IF NOT EXISTS `service_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `request_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cp2` (`client_id`,`provider_id`),
  KEY `idx_req2` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: service_edit_requests
CREATE TABLE IF NOT EXISTS `service_edit_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` bigint NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `additional_value` decimal(10,2) NOT NULL,
  `platform_fee` decimal(10,2) NOT NULL,
  `images_json` text COLLATE utf8mb4_unicode_ci,
  `video_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','accepted','declined') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `decided_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `service_edit_requests_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  CONSTRAINT `service_edit_requests_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_media
CREATE TABLE IF NOT EXISTS `service_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_type` enum('image','video','audio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `service_media_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_messages
CREATE TABLE IF NOT EXISTS `service_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conv2` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: service_requests
CREATE TABLE IF NOT EXISTS `service_requests` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` bigint NOT NULL,
  `category_id` int NOT NULL,
  `profession` varchar(128) DEFAULT NULL,
  `provider_id` bigint DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','accepted','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `price_estimated` decimal(10,2) DEFAULT NULL,
  `price_upfront` decimal(10,2) DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_remaining_status` varchar(32) DEFAULT 'pending',
  `proof_photo` varchar(255) DEFAULT NULL,
  `proof_code` varchar(32) DEFAULT NULL,
  `validation_code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `category_id` (`category_id`),
  KEY `provider_id` (`provider_id`),
  CONSTRAINT `service_requests_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  CONSTRAINT `service_requests_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`),
  CONSTRAINT `service_requests_ibfk_3` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_rejections
CREATE TABLE IF NOT EXISTS `service_rejections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_rejection` (`service_id`,`provider_id`),
  KEY `idx_service` (`service_id`),
  KEY `idx_provider` (`provider_id`),
  CONSTRAINT `service_rejections_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_rejections_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_reviews
CREATE TABLE IF NOT EXISTS `service_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_req2` (`request_id`),
  KEY `idx_provider` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: service_tasks
CREATE TABLE IF NOT EXISTS `service_tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_tasks_service` (`service_id`),
  CONSTRAINT `service_tasks_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: services
CREATE TABLE IF NOT EXISTS `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `provider_id` int DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `description` text,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: task_catalog
CREATE TABLE IF NOT EXISTS `task_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profession_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pricing_type` enum('fixed','per_unit') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `unit_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `keywords` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_catalog_profession` (`profession_id`),
  CONSTRAINT `task_catalog_ibfk_1` FOREIGN KEY (`profession_id`) REFERENCES `professions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: transactions
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('deposit','final_payment','payout','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','success','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `provider_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `service_id` (`service_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: user_devices
CREATE TABLE IF NOT EXISTS `user_devices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('android','ios','web') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `last_active` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_token` (`user_id`,`token`),
  CONSTRAINT `user_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('client','provider','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0',
  `avatar_blob` longblob,
  `avatar_mime` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
