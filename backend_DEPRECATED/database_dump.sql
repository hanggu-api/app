-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 27/01/2026 às 17:40
-- Versão do servidor: 8.0.44-0ubuntu0.24.04.1
-- Versão do PHP: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `app`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `ai_embeddings`
--

CREATE TABLE `ai_embeddings` (
  `id` int NOT NULL,
  `profession_id` int NOT NULL,
  `profession_name` varchar(255) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `category_name` varchar(255) DEFAULT NULL,
  `text` text,
  `embedding` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `ai_training_examples`
--

CREATE TABLE `ai_training_examples` (
  `id` int NOT NULL,
  `profession_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `text` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `ai_training_examples`
--

INSERT INTO `ai_training_examples` (`id`, `profession_id`, `category_id`, `text`, `created_at`) VALUES
(1, 4283, 1, 'pneu do carro muchou', '2026-01-26 16:02:04');

-- --------------------------------------------------------

--
-- Estrutura para tabela `appointments`
--

CREATE TABLE `appointments` (
  `id` bigint NOT NULL,
  `provider_id` bigint NOT NULL,
  `client_id` bigint DEFAULT NULL,
  `service_request_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('scheduled','completed','cancelled','busy','waiting_payment') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `appointments`
--

INSERT INTO `appointments` (`id`, `provider_id`, `client_id`, `service_request_id`, `start_time`, `end_time`, `status`, `notes`, `created_at`, `updated_at`) VALUES
(26, 832, 531, '9934c260-6af4-4416-9ceb-e72e08d135af', '2026-01-19 19:00:00', '2026-01-19 20:00:00', 'busy', 'Service: 1 - Serviço: Barba Completa\nquero fazer a barba', '2026-01-19 21:03:58', '2026-01-23 02:50:01'),
(27, 832, 531, '441ae629-3fe2-4957-ac47-6ac6f6c13a4c', '2026-01-22 09:00:00', '2026-01-22 10:00:00', 'waiting_payment', 'Service: 1 - Serviço: Barba Completa\nquero fazer a barba', '2026-01-22 01:27:27', '2026-01-22 01:27:27'),
(28, 832, 531, 'f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', '2026-01-22 14:30:00', '2026-01-22 15:30:00', 'waiting_payment', 'Service: 1 - Serviço: Barba Completa\nquero fazer a barba', '2026-01-22 16:27:47', '2026-01-22 16:27:47'),
(29, 832, 531, '888e7434-c181-4242-8ae4-a45cf291f9ee', '2026-01-23 09:00:00', '2026-01-23 10:00:00', 'scheduled', 'Service: 1 - Serviço: Corte Degradê (Fade)\nAgendamento de Corte', '2026-01-23 02:36:00', '2026-01-23 03:03:41'),
(30, 832, 531, '808386e1-42f5-4e5e-a6eb-958471c863a6', '2026-01-23 12:00:00', '2026-01-23 13:00:00', 'waiting_payment', 'Service: 1 - Serviço: Barba Simples (Máquina/Navalha)\nAgendamen', '2026-01-23 02:43:56', '2026-01-23 02:43:56'),
(31, 832, 531, 'f30f8308-ded6-465f-a764-394d79a71bc0', '2026-01-23 12:00:00', '2026-01-23 13:00:00', 'scheduled', 'Service: 1 - Serviço: Corte Social \nAgendamento de Corte Social', '2026-01-23 02:55:11', '2026-01-23 02:55:21'),
(32, 832, 531, '1ad1f9a6-58cc-4943-9529-d96132cb5178', '2026-01-23 16:00:00', '2026-01-23 17:00:00', 'scheduled', 'Service: 1 - Serviço: Barba (Barboterapia)\nAgendamento de Barba', '2026-01-23 17:30:22', '2026-01-23 17:30:32'),
(33, 832, 531, '6b82f28c-0876-4ac1-a927-d34bce350cc0', '2026-01-26 16:30:00', '2026-01-26 17:30:00', 'scheduled', 'Service: 1 - Serviço: Pezinho (Acabamento)\nquero fazer o pezinh', '2026-01-26 16:14:21', '2026-01-26 16:14:36'),
(34, 832, 531, '31097f51-4fb7-44d6-bf7b-c1f5ddeb4eb6', '2026-01-26 20:30:00', '2026-01-26 21:30:00', 'scheduled', 'Service: 1 - Serviço: Pezinho (Acabamento)\nquero fazer o pezinh', '2026-01-26 16:48:27', '2026-01-26 16:48:36');

-- --------------------------------------------------------

--
-- Estrutura para tabela `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `auth_users`
--

CREATE TABLE `auth_users` (
  `id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('client','provider') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `icon` varchar(50) DEFAULT 'box',
  `slug` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` bigint NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `type` enum('text','image','audio','location','video') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `professions`
--

CREATE TABLE `professions` (
  `id` int NOT NULL,
  `name` varchar(128) NOT NULL,
  `category_id` int DEFAULT NULL,
  `icon` varchar(64) DEFAULT NULL,
  `keywords` text,
  `search_vector` json DEFAULT NULL,
  `popularity_score` int DEFAULT '0',
  `service_type` enum('on_site','at_provider','remote') NOT NULL DEFAULT 'on_site'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `providers`
--

CREATE TABLE `providers` (
  `user_id` bigint NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating_avg` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `wallet_balance` decimal(10,2) DEFAULT '0.00',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT '0',
  `document_type` enum('cpf','cnpj') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_value` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commercial_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_custom_services`
--

CREATE TABLE `provider_custom_services` (
  `id` int NOT NULL,
  `provider_id` bigint NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `duration` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_locations`
--

CREATE TABLE `provider_locations` (
  `provider_id` bigint NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_professions`
--

CREATE TABLE `provider_professions` (
  `provider_user_id` bigint NOT NULL,
  `profession_id` int NOT NULL,
  `fixed_price` decimal(10,2) DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_schedule_configs`
--

CREATE TABLE `provider_schedule_configs` (
  `id` int NOT NULL,
  `provider_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL COMMENT '0=Sunday, 6=Saturday',
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lunch_start` time DEFAULT NULL,
  `lunch_end` time DEFAULT NULL,
  `slot_duration` int DEFAULT '30'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `task_catalog`
--

CREATE TABLE `task_catalog` (
  `id` int NOT NULL,
  `profession_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pricing_type` enum('fixed','per_unit') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `unit_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `keywords` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` bigint NOT NULL,
  `firebase_uid` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('client','provider','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified` tinyint(1) DEFAULT '0',
  `avatar_blob` longblob,
  `avatar_mime` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ... and other tables ...
COMMIT;
