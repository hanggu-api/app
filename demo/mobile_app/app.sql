-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 26/01/2026 às 14:53
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
(32, 832, 531, '1ad1f9a6-58cc-4943-9529-d96132cb5178', '2026-01-23 16:00:00', '2026-01-23 17:00:00', 'scheduled', 'Service: 1 - Serviço: Barba (Barboterapia)\nAgendamento de Barba', '2026-01-23 17:30:22', '2026-01-23 17:30:32');

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

--
-- Despejando dados para a tabela `auth_users`
--

INSERT INTO `auth_users` (`id`, `email`, `password`, `role`) VALUES
(1, 'client.teste@conserta.local', '$2a$10$nB6vkLj7LF2WB2qvCwErru6LslPTIvY2kxbaYDe9L01MUaykVe7kO', 'client'),
(2, 'provider.teste@conserta.local', '$2a$10$nB6vkLj7LF2WB2qvCwErru6LslPTIvY2kxbaYDe9L01MUaykVe7kO', 'provider');

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

--
-- Despejando dados para a tabela `categories`
--

INSERT INTO `categories` (`id`, `name`, `icon`, `slug`) VALUES
(1, 'Manutenção e Reparos', 'wrench', 'manutencao'),
(2, 'Limpeza e Diaristas', 'sparkles', 'limpeza'),
(3, 'Reformas e Obras', 'hammer', 'reformas'),
(4, 'Instalação Técnica', 'settings', 'instalacao'),
(5, 'Automotivo', 'car', 'automotivo'),
(6, 'Tecnologia', 'laptop', 'tecnologia'),
(7, 'Beleza e Bem-estar', 'smile', 'beleza'),
(8, 'Serviços Domésticos', 'home', 'domesticos'),
(9, 'Outros', 'box', 'outros'),
(10, 'Manutenção e Reparos', 'wrench', 'manutencao'),
(11, 'Limpeza e Diaristas', 'sparkles', 'limpeza'),
(12, 'Reformas e Obras', 'hammer', 'reformas'),
(13, 'Instalação Técnica', 'settings', 'instalacao'),
(14, 'Automotivo', 'car', 'automotivo'),
(15, 'Tecnologia', 'laptop', 'tecnologia'),
(16, 'Beleza e Bem-estar', 'smile', 'beleza'),
(17, 'Serviços Domésticos', 'home', 'domesticos'),
(18, 'Outros', 'box', 'outros');

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

--
-- Despejando dados para a tabela `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `service_id`, `sender_id`, `content`, `type`, `sent_at`, `read_at`) VALUES
(30, '9934c260-6af4-4416-9ceb-e72e08d135af', 832, 'oi', 'text', '2026-01-22 16:22:52', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `conversations`
--

CREATE TABLE `conversations` (
  `id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `request_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `locations`
--

CREATE TABLE `locations` (
  `id` int NOT NULL,
  `service_id` int NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `messages`
--

CREATE TABLE `messages` (
  `id` int NOT NULL,
  `service_id` int NOT NULL,
  `sender` enum('client','provider') NOT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `seen_by_user_at` timestamp NULL DEFAULT NULL,
  `seen_by_provider_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `missions`
--

CREATE TABLE `missions` (
  `id` int NOT NULL,
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
  `category` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `mission_media`
--

CREATE TABLE `mission_media` (
  `id` int NOT NULL,
  `mission_id` int NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(16) NOT NULL,
  `s3_key` varchar(512) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `related_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `notification_devices`
--

CREATE TABLE `notification_devices` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `token` varchar(256) NOT NULL,
  `platform` varchar(32) DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `notification_prefs`
--

CREATE TABLE `notification_prefs` (
  `user_id` int NOT NULL,
  `allow_payment` tinyint NOT NULL DEFAULT '1',
  `allow_mission` tinyint NOT NULL DEFAULT '1',
  `allow_chat` tinyint NOT NULL DEFAULT '1',
  `allow_general` tinyint NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `payments`
--

CREATE TABLE `payments` (
  `id` int NOT NULL,
  `mission_id` varchar(36) NOT NULL,
  `proposal_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `provider_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'BRL',
  `status` varchar(32) NOT NULL DEFAULT 'pending',
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
  `money_release_date` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `payments`
--

INSERT INTO `payments` (`id`, `mission_id`, `proposal_id`, `user_id`, `provider_id`, `amount`, `currency`, `status`, `mp_preference_id`, `mp_payment_id`, `external_ref`, `created_at`, `updated_at`, `status_detail`, `payment_method_id`, `payer_email`, `collector_id`, `net_received`, `fee_amount`, `installments`, `card_last_four`, `order_id`, `refund_status`, `refund_amount`, `refunded_at`, `canceled_at`, `money_release_date`) VALUES
(62, '3ad6e1e6-86c1-46db-a25f-6fb62814f7ad', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140147751300', NULL, '2025-12-31 11:22:08', '2025-12-31 11:23:27', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(63, 'dde555a4-08ad-406c-a784-a12ca3fbc6e1', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139501839763', NULL, '2025-12-31 11:58:11', '2025-12-31 12:00:05', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(64, 'a596d9ad-4f8f-4455-9b8e-fa1070e83791', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140152727012', NULL, '2025-12-31 12:14:13', '2025-12-31 12:17:37', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(65, 'c44f45c3-c710-498e-be29-de92ffc454d1', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139510060815', NULL, '2025-12-31 12:56:02', '2025-12-31 12:56:41', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(66, 'cd67c00b-03e7-46b2-b29e-62b31e340505', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139514853491', NULL, '2025-12-31 13:42:01', '2025-12-31 13:42:42', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(67, '3e9a7900-4aa6-4c67-9bff-2d18a3a8c9a7', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139520246035', NULL, '2025-12-31 14:29:01', '2025-12-31 14:29:57', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(68, '869e5ff8-2f74-4741-9686-a1c3d801bece', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140175962976', NULL, '2025-12-31 14:47:04', '2025-12-31 14:48:01', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(69, '5edf17b2-5b2d-4ec6-b2b8-64395759d7d6', NULL, 531, NULL, 3.00, 'BRL', 'cancelled', NULL, '139533894525', NULL, '2025-12-31 15:10:06', '2026-01-01 15:15:49', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(70, 'a3338842-f5a0-49bb-b9f5-1d8e66c967e0', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139533418981', NULL, '2025-12-31 15:13:12', '2025-12-31 15:13:48', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(71, 'f198e2ad-6fa6-4a02-b0d4-225d67ca7eaa', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140207138974', NULL, '2025-12-31 17:49:34', '2025-12-31 17:50:27', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(72, '215ac0d6-84a0-4665-9b3e-70aeeb5e65b7', NULL, 531, NULL, 3.00, 'BRL', 'rejected', NULL, '139563142973', NULL, '2025-12-31 18:18:54', '2025-12-31 18:18:55', 'cc_rejected_high_risk', 'master', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(73, '215ac0d6-84a0-4665-9b3e-70aeeb5e65b7', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140209433836', NULL, '2025-12-31 18:20:28', '2025-12-31 18:21:17', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(74, 'd27599c0-0f90-4038-98c6-9cf9e5181c02', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139584436647', NULL, '2025-12-31 20:58:16', '2025-12-31 21:01:42', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(75, '4394b762-889f-4b6b-bf9b-cbffcca0aaca', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '140233954696', NULL, '2025-12-31 21:10:16', '2025-12-31 21:10:51', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(76, 'e362b469-9d7d-47e4-84f9-a8afe936a5d2', NULL, 543, NULL, 3.00, 'BRL', 'cancelled', NULL, '140242596684', NULL, '2025-12-31 22:17:21', '2026-01-01 22:21:35', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(77, 'f1084643-0a89-4142-8b5f-d187c6eeca3a', NULL, 543, NULL, 3.00, 'BRL', 'cancelled', NULL, '140252076162', NULL, '2025-12-31 23:25:54', '2026-01-01 23:31:02', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(78, 'e325d883-7a44-43dc-ae0d-435d2765714a', NULL, 555, NULL, 3.00, 'BRL', 'cancelled', NULL, '140450972656', NULL, '2026-01-02 23:24:07', '2026-01-03 23:25:57', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(79, '628c6efe-9490-4e06-9b9d-d1cec5e59022', NULL, 558, NULL, 3.00, 'BRL', 'cancelled', NULL, '139802922477', NULL, '2026-01-02 23:28:52', '2026-01-03 23:30:49', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(80, '9691a3c5-eff0-4196-8f8f-11d2c3ab65ba', NULL, 560, NULL, 3.00, 'BRL', 'rejected', NULL, '140455386194', NULL, '2026-01-02 23:51:22', '2026-01-02 23:51:23', 'cc_rejected_high_risk', 'master', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(81, '9691a3c5-eff0-4196-8f8f-11d2c3ab65ba', NULL, 560, NULL, 3.00, 'BRL', 'pending', NULL, '549400694', NULL, '2026-01-02 23:51:54', NULL, 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(82, '681664ae-b8b0-4216-bc22-ff458115cbec', NULL, 578, NULL, 100.00, 'BRL', 'approved', NULL, '459930921', NULL, '2026-01-03 02:10:25', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767406224059@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(83, '395346db-59bb-406b-9329-1e17e3db0ca9', NULL, 579, NULL, 100.00, 'BRL', 'approved', NULL, '390669556', NULL, '2026-01-03 02:12:42', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767406361283@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(84, 'c15bcd79-bfb3-4c00-9e0c-9cdbcce470bb', NULL, 580, NULL, 100.00, 'BRL', 'approved', NULL, '922586130', NULL, '2026-01-03 02:27:50', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767407269015@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(85, 'aed87f18-e3fd-456f-af99-243de384cf14', NULL, 581, NULL, 100.00, 'BRL', 'approved', NULL, '791128740', NULL, '2026-01-03 02:37:55', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767407874666@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(86, 'dc9b0461-adfe-46af-9abb-68e3c25446b7', NULL, 582, NULL, 100.00, 'BRL', 'approved', NULL, '469706817', NULL, '2026-01-03 02:41:24', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767408082834@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(87, 'd31b8f67-b625-41e2-a686-eb5f716fe554', NULL, 583, NULL, 100.00, 'BRL', 'approved', NULL, '895311873', NULL, '2026-01-03 02:43:23', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767408202431@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(88, 'cf23bb0c-7983-4470-943f-b0692e88df56', NULL, 584, NULL, 100.00, 'BRL', 'approved', NULL, '825948990', NULL, '2026-01-03 02:45:44', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767408343034@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(89, '87d4865d-97bb-49e5-88b9-d9c86f745bd9', NULL, 585, NULL, 100.00, 'BRL', 'approved', NULL, '489607369', NULL, '2026-01-03 02:52:24', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767408742954@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(90, '33376e4e-bcaa-449a-9402-cc7dc6369345', NULL, 586, NULL, 100.00, 'BRL', 'approved', NULL, '663555983', NULL, '2026-01-03 03:11:16', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767409874752@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(91, '0b99d302-a856-4dfd-aadf-41d8a195bf92', NULL, 587, NULL, 100.00, 'BRL', 'approved', NULL, '883632804', NULL, '2026-01-03 03:12:43', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767409961731@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(92, '2054633c-89e6-451c-95a7-70a47716f1cb', NULL, 531, NULL, 3.00, 'BRL', 'approved', NULL, '139857375783', NULL, '2026-01-03 15:06:27', '2026-01-03 15:07:18', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(93, 'd5fbccad-7a1a-46e1-9827-c3c0c4e26da6', NULL, 588, NULL, 100.00, 'BRL', 'approved', NULL, '588388113', NULL, '2026-01-04 03:36:56', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767497813087@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(94, 'd3421ef0-3b48-48ab-85f0-e4fe941c211d', NULL, 589, NULL, 100.00, 'BRL', 'approved', NULL, '890875770', NULL, '2026-01-04 03:40:06', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767498003604@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(95, '46cc886e-c9f8-4a2d-94c3-79df85a604d3', NULL, 590, NULL, 100.00, 'BRL', 'approved', NULL, '819787339', NULL, '2026-01-04 03:46:55', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767498412674@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(96, '49db1ae5-7317-40cd-93cb-eb98c92d130f', NULL, 591, NULL, 100.00, 'BRL', 'approved', NULL, '726346898', NULL, '2026-01-04 04:16:55', NULL, 'accredited', 'pix', 'client_pedreiro_test_1767500213079@test.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(97, 'ebc7589a-9d7a-4244-9be6-ec131ab9b947', NULL, 531, NULL, 3.00, 'BRL', 'cancelled', NULL, '139956715001', NULL, '2026-01-04 12:56:47', '2026-01-05 13:01:59', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(98, 'fda89c9a-6315-47f7-9aa4-6f3ec8b434fa', NULL, 531, NULL, 3.00, 'BRL', 'cancelled', NULL, '139972418797', NULL, '2026-01-04 15:49:21', '2026-01-05 15:57:08', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(99, '605b8214-8296-434f-8098-0d803347c635', NULL, 610, NULL, 10.00, 'BRL', 'approved', NULL, '141004346958', NULL, '2026-01-07 12:31:27', '2026-01-07 12:31:28', 'accredited', 'master', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(100, '605b8214-8296-434f-8098-0d803347c635', NULL, 610, NULL, 10.00, 'BRL', 'approved', NULL, '518536448', NULL, '2026-01-07 12:31:58', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(101, 'b4907694-b086-463e-a73b-80fdd7e9d01d', NULL, 612, NULL, 10.00, 'BRL', 'approved', NULL, '141004859024', NULL, '2026-01-07 12:36:32', '2026-01-07 12:36:33', 'accredited', 'master', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(102, 'b4907694-b086-463e-a73b-80fdd7e9d01d', NULL, 612, NULL, 10.00, 'BRL', 'approved', NULL, '94028709', NULL, '2026-01-07 12:37:03', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(103, '86caa449-9189-4c55-85ff-9dcb72bbb1eb', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '929360022', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(104, 'ecaf46cc-8488-41bf-aba4-30ab7a1fafec', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '514642008', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(105, '98a340e1-5232-41f1-9615-580b718a26d9', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '53829730', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(106, 'eea20e21-ec4d-49b2-b315-9fd3e73eec6e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '787784822', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(107, 'f86fb7b1-cefd-4072-a1d1-14ae67eeba77', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '271862169', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(108, '7a6e9ca5-2723-418d-8ea4-695f0d2080df', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '542322433', NULL, '2026-01-07 20:52:58', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(109, '9f083a17-367a-4f07-8f92-2ec7609672f3', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '99400832', NULL, '2026-01-07 20:52:59', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(110, '023407b5-b109-4ba9-8836-2ec2d3b1293a', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '135087930', NULL, '2026-01-07 20:52:59', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(111, '55ab0763-35d0-4011-a1cc-a6b689354aa7', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '646999432', NULL, '2026-01-07 20:52:59', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(112, '50a03514-75f1-44a4-aff7-5856c7f43f6b', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '111212683', NULL, '2026-01-07 20:52:59', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(113, 'f53335e0-2808-4ab4-b2ed-ac98526a97bb', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '972998786', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(114, 'ac6b1be7-8ef3-48a1-9763-5c69ac66750d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '198846986', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(115, 'a4e7a75c-29c9-4182-8f50-edb997f91ad8', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '892828009', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(116, '76c4e352-0172-4ed5-92b7-c82d5fe69e67', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '21745542', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(117, '0ba37938-2257-4cc3-ac9e-d32731f5ddb1', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '335827911', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(118, 'aa860692-b88a-4d01-ab79-bfae7f18bb7a', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '868861026', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(119, '99450ed8-a4ea-4501-8d8d-c741a2c5c85e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '441066501', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(120, '8aecb269-dbeb-4a47-b23e-861d9c0cb146', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '563077002', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(121, 'b1da88f4-94a2-419c-9efc-801c7cad1790', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '936634070', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(122, '19e0f494-ce03-4318-942d-7aa65228ed34', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '607546316', NULL, '2026-01-07 20:53:15', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(123, '7f65d843-5ba1-4dab-a949-d44c74510d14', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '787757842', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(124, 'cc62a9b4-81c6-4822-a368-beb18c91c239', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '10405577', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(125, '41ec45b0-8676-4030-bb13-7724e609b620', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '320783686', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(126, '642dad6d-91cb-4005-bfa7-d3bfed8fb514', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '28180639', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(127, '5f21e064-9735-45f0-81b7-b747e4f272d2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '634609093', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(128, 'adf2fb2a-affa-4f4c-a12a-6dccf607a563', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '286573423', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(129, '5328f523-6da9-4dc2-b37e-cf5f8063ac25', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '185388179', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(130, '17875b9c-eccb-4def-abb1-13d29f505659', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '793196949', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(131, '8f15ae4a-3eb8-4ad0-b3a4-9eadbb6ed526', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '585096650', NULL, '2026-01-07 20:53:31', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(132, 'a9bee2d1-5581-4299-97e2-ada0c02d9ab2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '474262494', NULL, '2026-01-07 20:53:32', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(133, '5f4ef3eb-ef7b-4c9f-8910-f1bd8b63cba2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '810409920', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(134, '27e828ec-7f6a-4dd7-b1af-6efb39c4d65f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '430156058', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(135, 'aed73e03-b3c5-4f3b-80ae-00aff6832d21', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '177770567', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(136, '489770f5-0355-4b35-afed-0d8ebd61340f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '15346080', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(137, '19f1f811-a95d-4fbf-af2e-53968887275b', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '96228515', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(138, 'fe03da1f-916d-4142-af8b-7d7ff136fc42', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '240518130', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(139, '1c92146f-472b-4116-a7f8-0350dfa07925', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '430057169', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(140, '32f6d2e1-f6db-4cb2-9b52-69f23d05f0c1', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '119076398', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(141, 'dad6f468-139b-400a-b493-4b016c4526c3', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '530219495', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(142, '8beadf59-db93-4c50-ad4d-faa1307adba0', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '812502656', NULL, '2026-01-07 20:53:47', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(143, '8c8f69df-86e9-4964-ba01-8650553c583d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '105429089', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(144, '09ed31fb-9300-405f-a39f-e943b2eb182e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '865060101', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(145, 'ba20ed7f-27e4-414c-b7c1-482b3e3c50a9', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '222740172', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(146, '8d2fef3b-4504-425e-baeb-c7dba3dd4eac', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '545270614', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(147, 'c9bcd1cc-ef81-4cc5-a9e9-5520213706aa', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '758698992', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(148, 'c1e2eae6-32d6-4500-b235-0c92ae9dd719', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '431494969', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(149, 'e1d1a87c-e9af-4157-ab50-39e1f314bd4f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '821871220', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(150, 'ad24e00b-646e-47c9-a331-7898db9097ff', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '30329076', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(151, 'af5926bf-5889-46fa-9863-ed36647103f2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '983219048', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(152, '16e9691e-8409-4091-ad71-9dabc233bca6', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '138951763', NULL, '2026-01-07 20:54:03', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(153, 'aefedc30-00d2-4bc5-a181-21ec299465da', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '581235206', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(154, '4dc1a88b-b628-4c4d-b89c-090a070d54a2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '919882340', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(155, '28a2c10d-7dfb-4092-8f70-aedeb1ed8497', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '341899954', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(156, 'f51a0e00-1326-45a5-af11-b5d39fa96a43', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '908334056', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(157, '1f01aa56-cfd1-4900-a53b-90f3e75ae5be', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '893047494', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(158, 'abf06134-23e8-4c14-b8c4-fae02204718b', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '774779352', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(159, '8ade347c-3343-4b19-a2f5-3a99bfedf5ce', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '396952201', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(160, 'fc50227a-6ef2-44f8-b5dd-9c241002cf3d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '234404995', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(161, 'ea5f3d4f-9864-4ac5-9bf6-908efbfcd233', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '4528401', NULL, '2026-01-07 20:54:18', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(162, '56da2fd4-300e-49ee-82a4-b4812f3ccffd', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '66122195', NULL, '2026-01-07 20:54:19', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(163, '788966f4-ab07-40f0-9007-4dff40a037ed', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '314229995', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(164, '313d8495-a527-4425-a99b-5e830b2f0a2f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '700129503', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(165, '2aef1ad8-b1d2-4cd2-a14e-b887e5f3b0d7', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '545642067', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(166, 'a369ccfe-c5f2-45ce-a0f7-53cb6e263d67', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '826602091', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(167, 'e31c15e7-41b4-4299-acdf-a90837c85f73', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '872960988', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(168, '830de9d1-8680-437d-9421-95c828cbe2dc', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '410457896', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(169, 'f9859499-ab6c-43d4-ba1c-747e04303008', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '801809249', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(170, 'f40e3aee-b279-4b63-9b5c-b42792891464', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '672391418', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(171, '7807b333-35b1-4de9-ae25-0e0ad3d226ac', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '341375137', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(172, '0f9dfc92-395a-486c-b626-29b3672864f2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '696784649', NULL, '2026-01-07 20:54:34', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(173, '134e37c0-d72e-46d7-9957-361f2117c3b5', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '823139615', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(174, '2bc116e2-19aa-4ea0-b792-89055aecaf9f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '611169927', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(175, '09153923-659c-4693-ada8-71c10ed7b38c', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '868933109', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(176, 'ec738d35-33d8-4324-9cc6-4e2434da5b29', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '450702003', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(177, 'dc871e71-e914-40d4-93a8-57f4b1416984', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '805971563', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(178, '6b3f92e7-316e-454c-938f-ef694493a199', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '257835507', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(179, '7862c7db-95f9-47a8-853d-d96cf75f5f0d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '830084550', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(180, '811cae88-4613-4b61-ab74-86f3b3367327', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '965457365', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(181, '2cd8db27-2470-416e-bd5d-1238e114a437', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '954332571', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(182, 'c9e78747-ed98-49ba-9000-45066a657dcf', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '432818463', NULL, '2026-01-07 20:54:50', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(183, 'd69ae658-ea29-484a-a1a9-3662d5e1b2a7', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '980926082', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(184, 'cec50649-9e41-46a3-b05f-3d9f282993bc', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '785195155', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(185, '8c9b6032-cc3f-4f38-8233-10f6d4ed89df', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '979030941', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(186, '1425dae5-4431-4dbd-a185-a8d8a246be06', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '636222787', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(187, '1f794a94-b6c0-468b-95d6-c74f7b4adf1e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '932694877', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(188, 'b75acf24-d16f-41d8-a3ea-10b39c96c18a', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '200971424', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(189, '6498ab2a-f362-4489-bd32-0c55fa100123', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '509456440', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(190, '6f1367eb-2880-443c-a3d0-61e33e5ae810', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '124156914', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(191, 'fb6e11a6-31b3-4bac-8433-7f529d9d47bd', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '368191333', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(192, '9a85e88d-e3a2-4034-8115-7451005cd61f', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '466166402', NULL, '2026-01-07 20:55:05', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(193, 'ffcf4b8e-a49a-4f5a-8bb9-4b3788f03197', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '596409165', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(194, 'ec5da3a3-7a7f-4416-814d-290cb44ea14b', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '481757114', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(195, '016578e9-9e56-433a-8f77-a5fb70fe0b7d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '57197204', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(196, '9b2ae43b-0b32-4299-9144-992d4818620e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '126692811', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(197, '4fca067f-f532-4c03-b0b9-6b00335c521c', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '846652622', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(198, '99f7b9a9-c40b-478c-a1c8-7e44ffaef39d', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '466275162', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(199, 'fbbbdaaa-6e3d-44b2-bc59-f468678f73b2', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '828663049', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(200, '26b5b1e2-e12b-4784-986e-bff25ddb578e', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '751803160', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(201, '63900a6b-4479-453f-a361-83a8d6b4f47c', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '84552134', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(202, '1480348f-016c-4305-9c0d-6f64b875d041', NULL, 825, NULL, 1.00, 'BRL', 'approved', NULL, '94074821', NULL, '2026-01-07 20:55:21', NULL, 'accredited', 'pix', 'stress_client_1767819161565@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(203, '745f3a00-72df-48d4-964c-00295f1868ae', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '483679792', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(204, 'a6b0a3dd-038e-4b57-948f-3e2cccddaf55', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '368132490', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(205, '9e957c52-0abc-4592-b2d7-4b1f37f6bf10', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '311706950', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(206, '05ac7a0e-725a-44ce-8482-15056e585236', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '921548232', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(207, 'de17e154-b029-434e-b621-62eb2b01b693', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '602633505', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(208, '1386896c-dc8f-432c-b50b-2ed0a5a90258', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '601240147', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(209, '75d7dede-d140-46c4-a533-1a13fdf12273', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '712353791', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(210, 'df0fd5b0-d3ff-4245-93a6-c03c96ded576', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '794726239', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(211, 'e6571508-a3e7-49aa-bc65-5316ce3ec076', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '566553941', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(212, '72a7ba9a-5751-4d42-be82-dfb5f5a96854', NULL, 827, NULL, 1.00, 'BRL', 'approved', NULL, '704822651', NULL, '2026-01-07 21:04:05', NULL, 'accredited', 'pix', 'stress_client_1767819828191@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(213, '40011e27-d310-4dc0-8746-5ffda15cf350', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '912659309', NULL, '2026-01-07 21:09:40', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(214, 'd2e7348c-bb7c-49b7-91e7-3aacedadb968', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '34371233', NULL, '2026-01-07 21:09:40', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(215, '84d97024-0b0b-47cf-951a-2f46150ea52b', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '296975850', NULL, '2026-01-07 21:09:40', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(216, 'f7aa510b-6bd3-4ced-a5ad-226b7f70d753', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '488473058', NULL, '2026-01-07 21:09:40', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(217, '1805740a-7461-43f8-b755-f07f6bd14457', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '731608413', NULL, '2026-01-07 21:09:40', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(218, '0d350345-70ac-450f-9c4c-a772204cde5e', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '907162746', NULL, '2026-01-07 21:09:41', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(219, 'fa6f5603-2d34-4544-8c2a-482cb22f7e69', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '789778175', NULL, '2026-01-07 21:09:41', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(220, 'cdea598c-1f55-48c0-88ec-06f724eca741', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '891076594', NULL, '2026-01-07 21:09:41', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(221, 'c5d294e7-d42a-4302-a98f-a9ec581f8842', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '665270167', NULL, '2026-01-07 21:09:41', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(222, '11165032-68f4-4be6-942f-1fcfaf993408', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '268160360', NULL, '2026-01-07 21:09:41', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(223, 'bcd77fbe-3bec-4ea5-8134-01b1f8c602af', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '426867941', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(224, 'c926e422-55e0-426a-9eea-2c1c7a867cb5', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '808465615', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(225, '3faf48f5-c71d-42af-808d-91373d5d3f48', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '702172406', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(226, '0bbb81fc-3bd0-44bf-8b0a-79f450205962', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '358831781', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(227, '728ffaa2-952f-4d06-8d50-7c62422a5299', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '300948100', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(228, '27d02129-5f5a-40ee-8c8c-e0ae03f31607', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '946567522', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(229, '8cb23b95-41e7-4652-81c6-1a393b8e1048', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '938623345', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(230, '2b51d91a-892e-4427-bdc2-802a33b52da4', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '94721210', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(231, '2f960ca8-f5e3-458b-8efd-41d4c14f242e', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '778706214', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(232, '7b0d338a-daba-4645-b0d8-039718235018', NULL, 829, NULL, 1.00, 'BRL', 'approved', NULL, '824845319', NULL, '2026-01-07 21:10:01', NULL, 'accredited', 'pix', 'stress_client_1767820164961@cardapyia.test', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(233, 'bdab8bb6-efcc-4d5c-bb12-f9562e821645', NULL, 531, NULL, 10.00, 'BRL', 'approved', NULL, '916499579', NULL, '2026-01-08 14:35:30', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(234, '276884ff-d510-4130-9d29-10ef7c9fd50d', NULL, 531, NULL, 10.00, 'BRL', 'approved', NULL, '519252109', NULL, '2026-01-08 19:12:18', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(235, 'a4738262-643b-40e1-94ca-0025a48e235b', NULL, 531, NULL, 10.00, 'BRL', 'approved', NULL, '747218149', NULL, '2026-01-08 19:48:12', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(236, '18aa91fc-f5a0-4aba-bdfc-fd554e749c06', NULL, 531, NULL, 24.30, 'BRL', 'approved', NULL, '282307635', NULL, '2026-01-08 21:29:24', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(237, '8cae9e11-f614-4e25-ac01-9a2adfcc55ad', NULL, 531, NULL, 4.05, 'BRL', 'cancelled', NULL, '141304204270', NULL, '2026-01-09 12:15:07', '2026-01-16 19:30:55', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(238, '83f59ff6-7f59-4f33-bda7-1884aa4d3145', NULL, 531, NULL, 4.05, 'BRL', 'approved', NULL, '542160496', NULL, '2026-01-10 08:37:05', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(239, '8ea2130c-08af-459c-b728-890c5507d359', NULL, 531, NULL, 4.05, 'BRL', 'approved', NULL, '489038748', NULL, '2026-01-10 08:58:31', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(240, '62f35bb4-3928-4629-b72b-df0c750842bd', NULL, 531, NULL, 4.05, 'BRL', 'approved', NULL, '784388190', NULL, '2026-01-10 10:05:50', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(241, 'cf09ae44-ea31-4fe9-8da5-a037bc4c900a', NULL, 531, NULL, 4.05, 'BRL', 'approved', NULL, '492579415', NULL, '2026-01-10 10:18:11', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(242, '36de5abb-f76c-4bab-8aa6-a44d69f69ab7', NULL, 531, NULL, 4.50, 'BRL', 'pending', NULL, '963995752', NULL, '2026-01-10 12:13:16', NULL, 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(243, '5f256fc3-c878-4116-9dff-6fa4d2168c4b', NULL, 531, NULL, 4.50, 'BRL', 'pending', NULL, '297867548', NULL, '2026-01-10 12:18:05', NULL, 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `mission_id`, `proposal_id`, `user_id`, `provider_id`, `amount`, `currency`, `status`, `mp_preference_id`, `mp_payment_id`, `external_ref`, `created_at`, `updated_at`, `status_detail`, `payment_method_id`, `payer_email`, `collector_id`, `net_received`, `fee_amount`, `installments`, `card_last_four`, `order_id`, `refund_status`, `refund_amount`, `refunded_at`, `canceled_at`, `money_release_date`) VALUES
(244, '3520edd4-d0ec-49ca-968b-d62c039df965', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '141485837152', NULL, '2026-01-10 17:36:41', '2026-01-14 00:45:42', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(245, '5f9474b8-d83f-46bf-bb1f-73ee5647cc3e', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '140907015323', NULL, '2026-01-11 08:33:01', '2026-01-14 15:41:17', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(246, 'cb7539ff-b44a-4e8f-9ae2-cd1c7ffa7cf3', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '140906949729', NULL, '2026-01-11 08:54:25', '2026-01-14 16:06:34', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(247, '1b03bbff-a2a1-4c70-9935-e281c221f433', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '140907280041', NULL, '2026-01-11 09:19:30', '2026-01-18 16:36:01', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(248, '46cdc0b8-98de-4bb6-8fae-56251376a2bc', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '141650688960', NULL, '2026-01-12 01:34:43', '2026-01-15 08:45:29', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(249, 'fc47e6b0-c4b4-4a58-88de-3d75c30e8134', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '140995702091', NULL, '2026-01-12 03:08:10', '2026-01-15 10:15:36', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(250, '733cc8cd-edb2-4600-9def-eeffb996fbd9', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '141002801431', NULL, '2026-01-12 04:55:31', '2026-01-15 12:05:23', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(251, 'be422d73-22c8-433b-b701-5110feecb578', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '141002415719', NULL, '2026-01-12 05:02:18', '2026-01-15 12:10:28', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(252, 'c724200d-14d7-4c73-936f-831f8b56f334', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141002281813', NULL, '2026-01-12 05:04:43', '2026-01-14 12:10:40', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(253, '0b75294f-d74e-4538-85a7-9fb5b6cf8951', NULL, 531, NULL, 67.50, 'BRL', 'approved', NULL, '141003023613', NULL, '2026-01-12 05:20:05', '2026-01-14 12:25:31', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(254, '9ca8efe0-5940-4151-8223-79c1b8a1ea17', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141666874146', NULL, '2026-01-12 05:30:20', '2026-01-14 12:36:39', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(255, 'b05b052b-8925-4552-ad71-ad651b19d1e0', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '141666674286', NULL, '2026-01-12 05:34:52', '2026-01-15 12:40:34', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(256, '58e6aa59-9f7a-4360-8b78-e89035576bc0', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141663791792', NULL, '2026-01-12 05:54:18', '2026-01-14 13:02:04', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(257, '23a961dd-7d1a-4e84-b7c8-39a1f4f84c95', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141666574832', NULL, '2026-01-12 06:16:08', '2026-01-14 13:21:16', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(258, 'd749dbf2-b2b0-4930-bd01-6658fdf8104c', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141665593658', NULL, '2026-01-12 06:48:49', '2026-01-14 13:51:22', 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(259, 'c32cb450-fa75-4276-b337-f2233727a888', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141049088315', NULL, '2026-01-12 14:37:37', '2026-01-14 21:41:36', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(260, '5519193a-59cf-42f2-96f1-f6d26f875f40', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141137079993', NULL, '2026-01-13 02:19:15', '2026-01-15 09:25:21', 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(261, '054aa0c4-69a1-44d2-86b6-3f703e985176', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141142376405', NULL, '2026-01-13 03:06:11', '2026-01-15 10:10:28', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(262, '8dbf239e-c2d8-4e9c-a8c3-898dda8f5179', NULL, 531, NULL, 4.50, 'BRL', 'cancelled', NULL, '141802974850', NULL, '2026-01-13 03:10:34', '2026-01-14 03:15:38', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(263, 'e8cae1c8-a24e-41f1-bb57-0eb3419141ca', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141803385140', NULL, '2026-01-13 03:23:37', '2026-01-15 10:25:43', 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(264, '03573cf0-da7b-467d-ad04-a9c22be38058', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141827204532', NULL, '2026-01-13 10:50:36', '2026-01-13 17:50:46', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(265, '99c9e547-9328-4cba-a997-4ef9fa7ade7a', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141837396968', NULL, '2026-01-13 12:35:19', '2026-01-13 13:36:14', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(266, 'b72be314-156d-497f-9478-848d695b3b07', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141840826104', NULL, '2026-01-13 12:56:33', '2026-01-13 13:15:48', 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(267, '2d30cea7-8c6d-49e4-a4d5-83a3f28c0057', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141841220004', NULL, '2026-01-13 13:21:31', '2026-01-13 13:22:09', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(268, 'bd8a54b3-6def-4400-8a9d-3d00da753728', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141862633476', NULL, '2026-01-13 15:52:28', '2026-01-13 15:53:26', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(269, 'ad39bb9c-e1eb-4207-8c97-2c11b797b29d', NULL, 531, NULL, 4.50, 'BRL', 'approved', NULL, '141948782008', NULL, '2026-01-14 06:54:22', '2026-01-14 06:55:06', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(270, 'ad39bb9c-e1eb-4207-8c97-2c11b797b29d', NULL, 531, NULL, 10.50, 'BRL', 'approved', NULL, '141289333347', NULL, '2026-01-14 07:37:37', '2026-01-14 07:38:15', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(271, 'ac9ae1c2-5ad8-4b1c-ae21-26a77b2772d0', NULL, 531, NULL, 24.00, 'BRL', 'approved', NULL, '142571059236', NULL, '2026-01-18 21:02:28', '2026-01-18 21:03:46', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(272, '38d4d88a-8fb4-4141-9590-10e59b10b85b', NULL, 531, NULL, 45.00, 'BRL', 'approved', NULL, '141911652221', NULL, '2026-01-18 22:18:31', '2026-01-18 22:19:18', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(273, '8b2b736f-8eba-4eb2-9f02-6ba04c7385f9', NULL, 531, NULL, 45.00, 'BRL', 'approved', NULL, '141941331589', NULL, '2026-01-19 05:08:31', '2026-01-19 05:09:11', 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(274, 'fb4716b8-81da-404c-b739-d976fa82594f', NULL, 531, NULL, 24.00, 'BRL', 'cancelled', NULL, '141989040807', NULL, '2026-01-19 15:05:40', '2026-01-20 15:10:48', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(275, 'f9bc95cc-8392-4a2f-bd5f-c7cb2a89d09b', NULL, 531, NULL, 24.00, 'BRL', 'cancelled', NULL, '141989247443', NULL, '2026-01-19 15:11:31', '2026-01-20 15:15:55', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(276, 'bfefa30d-a378-43d4-8570-005879a8217d', NULL, 531, NULL, 24.00, 'BRL', 'cancelled', NULL, '141994045453', NULL, '2026-01-19 15:46:24', '2026-01-20 15:52:00', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(277, '0c822ae8-301e-4649-82d5-1f19909b5579', NULL, 531, NULL, 24.00, 'BRL', 'cancelled', NULL, '142665828182', NULL, '2026-01-19 15:51:15', '2026-01-20 15:55:52', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(278, '0c822ae8-301e-4649-82d5-1f19909b5579', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '141993972003', NULL, '2026-01-19 15:52:47', '2026-01-20 15:56:26', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(279, '0c822ae8-301e-4649-82d5-1f19909b5579', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '142666168220', NULL, '2026-01-19 15:53:54', '2026-01-20 16:00:04', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(280, '0c822ae8-301e-4649-82d5-1f19909b5579', NULL, 531, NULL, 45.00, 'BRL', 'cancelled', NULL, '141995385285', NULL, '2026-01-19 15:55:05', '2026-01-20 16:00:58', 'pending_waiting_transfer', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(281, '0c822ae8-301e-4649-82d5-1f19909b5579', NULL, 531, NULL, 45.00, 'BRL', 'approved', NULL, '158508170', NULL, '2026-01-19 15:58:56', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(282, '9c6cea93-d725-48c5-82a0-4333cc18735c', NULL, 531, NULL, 24.00, 'BRL', 'approved', NULL, '554556509', NULL, '2026-01-19 18:52:20', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(283, 'bd69095c-2f7c-4bd6-b064-436200db3bb6', NULL, 531, NULL, 24.00, 'BRL', 'approved', NULL, '755395951', NULL, '2026-01-19 20:47:24', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(284, '9934c260-6af4-4416-9ceb-e72e08d135af', NULL, 531, NULL, 12.00, 'BRL', 'approved', NULL, '939209492', NULL, '2026-01-19 21:04:01', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(285, '441ae629-3fe2-4957-ac47-6ac6f6c13a4c', NULL, 531, NULL, 12.00, 'BRL', 'approved', NULL, '216057719', NULL, '2026-01-22 01:27:31', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(286, 'f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', NULL, 531, NULL, 12.00, 'BRL', 'approved', NULL, '223467912', NULL, '2026-01-22 16:27:56', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(287, '888e7434-c181-4242-8ae4-a45cf291f9ee', NULL, 531, NULL, 15.90, 'BRL', 'approved', NULL, '78595031', NULL, '2026-01-23 02:36:07', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(288, '808386e1-42f5-4e5e-a6eb-958471c863a6', NULL, 531, NULL, 9.00, 'BRL', 'approved', NULL, '849278507', NULL, '2026-01-23 02:44:02', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(289, 'f30f8308-ded6-465f-a764-394d79a71bc0', NULL, 531, NULL, 12.60, 'BRL', 'approved', NULL, '123335565', NULL, '2026-01-23 02:55:16', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL),
(290, '1ad1f9a6-58cc-4943-9529-d96132cb5178', NULL, 531, NULL, 12.00, 'BRL', 'approved', NULL, '467802506', NULL, '2026-01-23 17:30:27', NULL, 'accredited', 'pix', 'usuario@exemplo.com', NULL, NULL, NULL, 1, 'PIX', NULL, NULL, NULL, NULL, NULL, NULL);

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

--
-- Despejando dados para a tabela `professions`
--

INSERT INTO `professions` (`id`, `name`, `category_id`, `icon`, `keywords`, `search_vector`, `popularity_score`, `service_type`) VALUES
(3728, 'Eletricista', 2, NULL, 'elétrica,fiação,tomada,disjuntor,chuveiro,luz,instalação elétrica', NULL, 0, 'on_site'),
(3729, 'Encanador', NULL, NULL, 'hidráulica,cano,vazamento,torneira,caixa d\'água,esgoto,bombeiro hidráulico', NULL, 0, 'on_site'),
(3730, 'Pintor', 3, NULL, 'pintura,parede,tinta,acabamento,textura,massa corrida', NULL, 0, 'on_site'),
(3731, 'Pedreiro', 6, NULL, 'construção,reforma,obras,pedreiro,alvenaria,telhadista,azulejista,mestre de obras', NULL, 0, 'on_site'),
(3732, 'Carpinteiro', 4, NULL, 'madeira,móveis,portas,reforma,carpinteiro,montador de móveis,marceneiro,deck', NULL, 0, 'on_site'),
(3735, 'Vidraceiro', NULL, NULL, 'vidro,janela,box,espelho,cortina de vidro,fechamento de varanda', NULL, 0, 'on_site'),
(3736, 'Chaveiro', 5, NULL, 'chaves,fechadura,abertura,codificação,segurança,cadeado,chaveiro 24h', NULL, 0, 'on_site'),
(3737, 'Gesseiro', 5, NULL, 'gesso,drywall,sanca,forro,moldura,parede,reforma', NULL, 0, 'on_site'),
(3740, 'Serralheiro', 5, NULL, 'ferro,portão,grade,solda,estrutura metálica,alumínio', NULL, 0, 'on_site'),
(3742, 'Diarista', 6, NULL, 'limpeza,faxina,casa,organização,passar roupa,cozinhar', NULL, 0, 'on_site'),
(3744, 'Técnico de Refrigeração', 5, NULL, 'ar condicionado,refrigeração,climatização,split,manutenção,instalação de ar,geladeira,freezer', NULL, 0, 'on_site'),
(4187, 'Fisioterapeuta', NULL, NULL, 'fisioterapia,reabilitação,massagem,dor,coluna,pilates', NULL, 0, 'at_provider'),
(4189, 'Nutricionista', NULL, NULL, 'dieta,alimentação,saúde,emagrecimento,nutrição', NULL, 0, 'at_provider'),
(4190, 'Psicólogo', NULL, NULL, 'terapia,saúde mental,ansiedade,depressão,acompanhamento', NULL, 0, 'at_provider'),
(4196, 'Barbeiro', NULL, NULL, 'cabelo,barba,bigode,corte masculino,degradê', NULL, 80, 'at_provider'),
(4202, 'Cabeleireiro', NULL, NULL, 'cabelo,corte,pintura,mechas,escova,progressiva,cabelereira', NULL, 0, 'at_provider'),
(4203, 'Manicure', NULL, NULL, 'unha,pé,mão,esmalte,alongamento,gel,fibras', NULL, 0, 'at_provider'),
(4220, 'Esteticista', NULL, NULL, 'pele,limpeza de pele,massagem,drenagem,depilação,sobrancelha', NULL, 0, 'at_provider'),
(4242, 'Jardinagem', NULL, NULL, 'jardim,grama,poda,plantas,paisagismo,corte de grama', NULL, 0, 'on_site'),
(4248, 'Maquiadora', NULL, NULL, 'maquiagem,make,noiva,festa,produção', NULL, 0, 'at_provider'),
(4249, 'Médico', NULL, NULL, 'saúde,consulta,doença,exame,clínico geral,pediatra,cardiologista', NULL, 0, 'at_provider'),
(4253, 'Dentista', NULL, NULL, 'dente,odontologia,boca,clareamento,aparelho,canal,extração', NULL, 0, 'at_provider'),
(4254, 'Enfermeiro', NULL, NULL, 'enfermagem,cuidados,curativo,injeção,home care,idosos', NULL, 0, 'on_site'),
(4270, 'Profissão Teste Bot 2', 1, NULL, NULL, NULL, 0, 'on_site'),
(4271, 'Profissão Teste Restrito', 1, NULL, NULL, NULL, 0, 'on_site'),
(4272, 'erweqwe', 1, NULL, NULL, NULL, 0, 'on_site'),
(4273, 'segurança privado', 9, NULL, NULL, NULL, 0, 'on_site'),
(4274, 'segurnaça privada', 9, NULL, NULL, NULL, 0, 'on_site'),
(4275, 'Técnico de Fogão de Gás', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4276, 'Home Office', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4277, 'Gerson', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4278, 'Motorista particular', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4279, 'Montador de Imóveis', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4280, 'Design de Sobrancelhas', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4281, 'Depilação', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4282, 'Técnico de segurança eletrônica', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4283, 'Borracheiro', NULL, NULL, NULL, NULL, 0, 'on_site'),
(4284, 'Cilios', NULL, NULL, NULL, NULL, 0, 'on_site');

-- --------------------------------------------------------

--
-- Estrutura para tabela `proposals`
--

CREATE TABLE `proposals` (
  `id` int NOT NULL,
  `mission_id` int NOT NULL,
  `user_id` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `deadline_days` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'sent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
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

--
-- Despejando dados para a tabela `providers`
--

INSERT INTO `providers` (`user_id`, `bio`, `address`, `rating_avg`, `rating_count`, `wallet_balance`, `latitude`, `longitude`, `is_online`, `document_type`, `document_value`, `commercial_name`) VALUES
(528, '', NULL, 0.00, 0, 0.00, NULL, NULL, 0, 'cpf', '756.756.756-75', 'lima redormas '),
(531, 'Fake Provider', NULL, 0.00, 0, 0.00, NULL, NULL, 1, NULL, NULL, NULL),
(832, NULL, 'Rua Antonio Nunes, 9 - Centro, Imperatriz - Maranhão (65909-655)', 0.00, 0, 0.00, -5.52293500, -47.47647500, 0, NULL, NULL, 'barba ruiva'),
(833, NULL, 'Rua Tocantins, 30 - Parque das Palmeiras, Imperatriz - Maranhão (65911-773)', 0.00, 0, 0.00, -5.50521170, -47.45261170, 0, NULL, NULL, 'cabelo'),
(834, NULL, NULL, 0.00, 0, 0.00, -5.50574760, -47.45368900, 1, NULL, NULL, NULL),
(835, NULL, NULL, 0.00, 0, 0.00, -5.51574760, -47.46368900, 1, NULL, NULL, NULL),
(849, NULL, 'Loc: -5.52791, -47.47927', 0.00, 0, 0.00, -5.52791191, -47.47927136, 0, NULL, NULL, 'Lucas cabelira'),
(850, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(852, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(854, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(856, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(858, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(860, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(862, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(864, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(866, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(868, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(870, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(872, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(873, NULL, 'Rua João Walcacer de Oliveira, 16 - Parque das Palmeiras, Imperatriz - Maranhão (65911-773)', 0.00, 0, 0.00, -5.50441849, -47.45359924, 0, NULL, NULL, 'stjwtnqf'),
(874, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL),
(877, NULL, NULL, 0.00, 0, 0.00, NULL, NULL, 0, NULL, NULL, NULL);

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

--
-- Despejando dados para a tabela `provider_custom_services`
--

INSERT INTO `provider_custom_services` (`id`, `provider_id`, `name`, `description`, `duration`, `price`, `category`, `active`, `created_at`) VALUES
(159, 832, 'Barba (Barboterapia)', NULL, 30, 40.00, NULL, 1, '2026-01-09 21:32:13'),
(160, 832, 'Barba (Barboterapia/Toalha Quente)', NULL, 30, 40.00, NULL, 1, '2026-01-09 21:32:13'),
(161, 832, 'Barba Completa', NULL, 30, 40.01, NULL, 1, '2026-01-09 21:32:14'),
(162, 832, 'Barba Simples (Máquina/Navalha)', NULL, 20, 30.00, NULL, 1, '2026-01-09 21:32:14'),
(163, 832, 'Barboterapia', NULL, 45, 50.00, NULL, 1, '2026-01-09 21:32:15'),
(164, 832, 'Barboterapia (Toalha Quente)', NULL, 40, 53.00, NULL, 1, '2026-01-09 21:32:15'),
(165, 832, 'Camuflagem de Fios', NULL, 20, 40.00, NULL, 1, '2026-01-09 21:32:15'),
(166, 832, 'Combo: Cabelo + Barba', NULL, 75, 80.00, NULL, 1, '2026-01-09 21:32:16'),
(167, 832, 'Combo: Corte + Barba', NULL, 70, 80.00, NULL, 1, '2026-01-09 21:32:16'),
(168, 832, 'Corte Degradê (Fade)', NULL, 45, 53.00, NULL, 1, '2026-01-09 21:32:17'),
(169, 832, 'Corte Masculino (Social)', NULL, 30, 38.00, NULL, 1, '2026-01-09 21:32:18'),
(170, 832, 'Corte Social', NULL, 40, 42.00, NULL, 1, '2026-01-09 21:32:18'),
(171, 832, 'Degradê (Fade)', NULL, 55, 45.00, NULL, 1, '2026-01-09 21:32:19'),
(172, 832, 'Pezinho (Acabamento)', NULL, 15, 18.00, NULL, 1, '2026-01-09 21:32:19'),
(173, 832, 'Pezinho (Contorno)', NULL, 15, 15.00, NULL, 1, '2026-01-09 21:32:20'),
(174, 832, 'Pigmentação de Barba/Cabelo', NULL, 30, 40.00, NULL, 1, '2026-01-09 21:32:20'),
(175, 832, 'Sobrancelha (Navalha)', NULL, 15, 20.00, NULL, 1, '2026-01-09 21:32:20'),
(176, 833, 'Cauterização Capilar', NULL, 80, 150.00, NULL, 1, '2026-01-10 00:30:03'),
(177, 833, 'Botox Capilar', NULL, 90, 120.00, NULL, 1, '2026-01-10 00:30:03'),
(178, 833, 'Coloração (Só aplicação)', NULL, 45, 60.00, NULL, 1, '2026-01-10 00:30:04'),
(179, 833, 'Corte Degradê (Fade)', NULL, 50, 50.00, NULL, 1, '2026-01-10 00:30:04'),
(180, 833, 'Corte Feminino', NULL, 60, 70.00, NULL, 1, '2026-01-10 00:30:05'),
(181, 833, 'Corte Feminino (Lavado)', NULL, 60, 80.00, NULL, 1, '2026-01-10 00:30:05'),
(182, 833, 'Corte Masculino (Simples)', NULL, 45, 40.00, NULL, 1, '2026-01-10 00:30:06'),
(183, 833, 'Corte Masculino (Simples/Social)', NULL, 40, 40.00, NULL, 1, '2026-01-10 00:30:06'),
(184, 833, 'Escova (Brushing)', NULL, 50, 60.00, NULL, 1, '2026-01-10 00:30:07'),
(185, 833, 'Escova + Chapinha', NULL, 50, 65.00, NULL, 1, '2026-01-10 00:30:07'),
(186, 833, 'Hidratação Profunda', NULL, 40, 70.00, NULL, 1, '2026-01-10 00:30:08'),
(187, 833, 'Luzes / Mechas', NULL, 240, 425.00, NULL, 1, '2026-01-10 00:30:08'),
(188, 833, 'Matização', NULL, 30, 50.00, NULL, 1, '2026-01-10 00:30:09'),
(189, 833, 'Progressiva / Selagem', NULL, 120, 185.00, NULL, 1, '2026-01-10 00:30:09'),
(190, 833, 'Selagem / Progressiva', NULL, 150, 225.00, NULL, 1, '2026-01-10 00:30:10'),
(191, 833, 'Coloração (Aplicação)', NULL, 60, 70.00, NULL, 1, '2026-01-10 00:30:10'),
(192, 849, 'Barba (Barboterapia)', NULL, 30, 40.00, NULL, 1, '2026-01-11 13:17:48'),
(193, 849, 'Barba (Barboterapia/Toalha Quente)', NULL, 30, 40.00, NULL, 1, '2026-01-11 13:17:49'),
(194, 849, 'Barba Completa', NULL, 30, 40.01, NULL, 1, '2026-01-11 13:17:50'),
(195, 849, 'Barba Simples (Máquina/Navalha)', NULL, 20, 30.00, NULL, 1, '2026-01-11 13:17:50'),
(196, 849, 'Barboterapia', NULL, 45, 50.00, NULL, 1, '2026-01-11 13:17:51'),
(197, 849, 'Barboterapia (Toalha Quente)', NULL, 40, 53.00, NULL, 1, '2026-01-11 13:17:51'),
(198, 849, 'Camuflagem de Fios', NULL, 20, 40.00, NULL, 1, '2026-01-11 13:17:52'),
(199, 849, 'Combo: Cabelo + Barba', NULL, 75, 80.00, NULL, 1, '2026-01-11 13:17:52'),
(200, 849, 'Combo: Corte + Barba', NULL, 70, 80.00, NULL, 1, '2026-01-11 13:17:53'),
(201, 849, 'Corte Degradê (Fade)', NULL, 45, 53.00, NULL, 1, '2026-01-11 13:17:54'),
(202, 849, 'Corte Masculino (Social)', NULL, 30, 38.00, NULL, 1, '2026-01-11 13:17:54'),
(203, 849, 'Corte Social', NULL, 40, 42.00, NULL, 1, '2026-01-11 13:17:55'),
(204, 849, 'Degradê (Fade)', NULL, 55, 45.00, NULL, 1, '2026-01-11 13:17:56'),
(205, 849, 'Pezinho (Acabamento)', NULL, 15, 18.00, NULL, 1, '2026-01-11 13:17:56'),
(206, 849, 'Pezinho (Contorno)', NULL, 15, 15.00, NULL, 1, '2026-01-11 13:17:57'),
(207, 849, 'Pigmentação de Barba/Cabelo', NULL, 30, 40.00, NULL, 1, '2026-01-11 13:17:58'),
(208, 849, 'Sobrancelha (Navalha)', NULL, 15, 20.00, NULL, 1, '2026-01-11 13:17:58'),
(209, 873, 'Barba (Barboterapia)', NULL, 30, 40.00, NULL, 1, '2026-01-12 01:53:53'),
(210, 873, 'Barba (Barboterapia/Toalha Quente)', NULL, 30, 40.00, NULL, 1, '2026-01-12 01:53:54'),
(211, 873, 'Barba Completa', NULL, 30, 40.01, NULL, 1, '2026-01-12 01:53:54'),
(212, 873, 'Barba Simples (Máquina/Navalha)', NULL, 20, 30.00, NULL, 1, '2026-01-12 01:53:55'),
(213, 873, 'Barboterapia', NULL, 45, 50.00, NULL, 1, '2026-01-12 01:53:55'),
(214, 873, 'Barboterapia (Toalha Quente)', NULL, 40, 53.00, NULL, 1, '2026-01-12 01:53:56'),
(215, 873, 'Camuflagem de Fios', NULL, 20, 40.00, NULL, 1, '2026-01-12 01:53:56'),
(216, 873, 'Combo: Cabelo + Barba', NULL, 75, 80.00, NULL, 1, '2026-01-12 01:53:57'),
(217, 873, 'Combo: Corte + Barba', NULL, 70, 80.00, NULL, 1, '2026-01-12 01:53:58'),
(218, 873, 'Corte Degradê (Fade)', NULL, 45, 53.00, NULL, 1, '2026-01-12 01:53:58'),
(219, 873, 'Corte Masculino (Social)', NULL, 30, 38.00, NULL, 1, '2026-01-12 01:53:59'),
(220, 873, 'Corte Social', NULL, 40, 42.00, NULL, 1, '2026-01-12 01:53:59'),
(221, 873, 'Degradê (Fade)', NULL, 55, 45.00, NULL, 1, '2026-01-12 01:54:00'),
(222, 873, 'Pezinho (Acabamento)', NULL, 15, 18.00, NULL, 1, '2026-01-12 01:54:00'),
(223, 873, 'Pezinho (Contorno)', NULL, 15, 15.00, NULL, 1, '2026-01-12 01:54:01'),
(224, 873, 'Pigmentação de Barba/Cabelo', NULL, 30, 40.00, NULL, 1, '2026-01-12 01:54:01'),
(225, 873, 'Sobrancelha (Navalha)', NULL, 15, 20.00, NULL, 1, '2026-01-12 01:54:02');

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

--
-- Despejando dados para a tabela `provider_locations`
--

INSERT INTO `provider_locations` (`provider_id`, `latitude`, `longitude`, `updated_at`) VALUES
(528, -5.53067010, -47.48066350, '2026-01-04 12:46:20'),
(531, -5.50757830, -47.46105500, '2026-01-13 19:14:09'),
(550, -5.51658150, -47.46478510, '2026-01-02 20:49:34'),
(554, -5.52447330, -47.47680500, '2026-01-03 00:42:58'),
(564, -23.55050000, -46.63330000, '2026-01-03 01:25:50'),
(572, -5.50575470, -47.45373210, '2026-01-03 02:00:43'),
(609, -5.53066480, -47.48064950, '2026-01-04 15:14:07'),
(723, -23.54102985, -46.63330306, '2026-01-08 02:43:05'),
(724, -23.54735833, -46.62847156, '2026-01-08 02:43:43'),
(725, -23.54619530, -46.62459507, '2026-01-08 02:43:44'),
(831, -23.54552000, -46.62830800, '2026-01-08 19:11:19'),
(832, -5.50576750, -47.45373110, '2026-01-11 07:44:46'),
(834, -5.51000330, -47.45616670, '2026-01-11 07:44:46'),
(835, -5.50598310, -47.45349620, '2026-01-26 14:30:12');

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_media`
--

CREATE TABLE `provider_media` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(16) NOT NULL,
  `s3_key` varchar(512) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_penalties`
--

CREATE TABLE `provider_penalties` (
  `id` int NOT NULL,
  `provider_id` int NOT NULL,
  `request_id` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

--
-- Despejando dados para a tabela `provider_professions`
--

INSERT INTO `provider_professions` (`provider_user_id`, `profession_id`, `fixed_price`, `hourly_rate`) VALUES
(211, 3731, NULL, NULL),
(211, 3732, NULL, NULL),
(214, 3731, NULL, NULL),
(219, 3731, NULL, NULL),
(220, 3729, NULL, NULL),
(221, 3729, NULL, NULL),
(227, 3731, NULL, NULL),
(228, 3731, NULL, NULL),
(229, 3731, NULL, NULL),
(230, 3731, NULL, NULL),
(231, 3731, NULL, NULL),
(232, 3731, NULL, NULL),
(233, 3731, NULL, NULL),
(234, 3731, NULL, NULL),
(235, 3731, NULL, NULL),
(236, 3731, NULL, NULL),
(237, 3731, NULL, NULL),
(238, 3731, NULL, NULL),
(239, 3731, NULL, NULL),
(240, 3731, NULL, NULL),
(241, 3731, NULL, NULL),
(242, 3731, NULL, NULL),
(243, 3731, NULL, NULL),
(244, 3731, NULL, NULL),
(245, 3731, NULL, NULL),
(246, 3731, NULL, NULL),
(247, 3731, NULL, NULL),
(248, 3731, NULL, NULL),
(249, 3731, NULL, NULL),
(250, 3731, NULL, NULL),
(251, 3731, NULL, NULL),
(252, 3731, NULL, NULL),
(253, 3731, NULL, NULL),
(254, 3731, NULL, NULL),
(255, 3731, NULL, NULL),
(256, 3731, NULL, NULL),
(468, 3731, NULL, NULL),
(469, 3731, NULL, NULL),
(470, 3731, NULL, NULL),
(471, 3731, NULL, NULL),
(472, 3731, NULL, NULL),
(473, 3731, NULL, NULL),
(474, 3731, NULL, NULL),
(475, 3731, NULL, NULL),
(476, 3731, NULL, NULL),
(477, 3731, NULL, NULL),
(478, 3731, NULL, NULL),
(479, 3731, NULL, NULL),
(480, 3731, NULL, NULL),
(481, 3731, NULL, NULL),
(482, 3731, NULL, NULL),
(483, 3731, NULL, NULL),
(484, 3731, NULL, NULL),
(485, 3731, NULL, NULL),
(486, 3731, NULL, NULL),
(487, 3731, NULL, NULL),
(488, 3731, NULL, NULL),
(489, 3731, NULL, NULL),
(490, 3731, NULL, NULL),
(491, 3731, NULL, NULL),
(492, 3731, NULL, NULL),
(493, 3731, NULL, NULL),
(494, 3731, NULL, NULL),
(495, 3731, NULL, NULL),
(496, 3731, NULL, NULL),
(497, 3731, NULL, NULL),
(507, 3728, NULL, NULL),
(507, 3729, NULL, NULL),
(509, 3728, NULL, NULL),
(509, 3729, NULL, NULL),
(511, 3728, NULL, NULL),
(511, 3729, NULL, NULL),
(513, 3728, NULL, NULL),
(513, 3729, NULL, NULL),
(515, 3728, NULL, NULL),
(515, 3729, NULL, NULL),
(517, 3728, NULL, NULL),
(517, 3729, NULL, NULL),
(519, 3728, NULL, NULL),
(519, 3729, NULL, NULL),
(521, 3728, NULL, NULL),
(521, 3729, NULL, NULL),
(523, 3728, NULL, NULL),
(523, 3729, NULL, NULL),
(525, 3728, NULL, NULL),
(525, 3729, NULL, NULL),
(528, 3736, NULL, NULL),
(528, 3744, NULL, NULL),
(547, 4196, NULL, NULL),
(548, 4202, NULL, NULL),
(549, 4202, NULL, NULL),
(550, 3728, NULL, NULL),
(551, 4202, NULL, NULL),
(552, 3731, NULL, NULL),
(553, 3731, NULL, NULL),
(554, 3736, NULL, NULL),
(564, 3731, NULL, NULL),
(572, 3731, NULL, NULL),
(594, 4196, NULL, NULL),
(596, 4196, NULL, NULL),
(598, 4196, NULL, NULL),
(600, 4196, NULL, NULL),
(602, 4196, NULL, NULL),
(604, 4196, NULL, NULL),
(606, 4196, NULL, NULL),
(608, 4196, NULL, NULL),
(609, 3731, NULL, NULL),
(722, 1, NULL, NULL),
(722, 2, NULL, NULL),
(723, 1, NULL, NULL),
(723, 2, NULL, NULL),
(723, 4196, NULL, NULL),
(724, 1, NULL, NULL),
(724, 2, NULL, NULL),
(724, 4196, NULL, NULL),
(725, 1, NULL, NULL),
(725, 2, NULL, NULL),
(725, 4196, NULL, NULL),
(726, 1, NULL, NULL),
(726, 2, NULL, NULL),
(727, 1, NULL, NULL),
(727, 2, NULL, NULL),
(728, 1, NULL, NULL),
(728, 2, NULL, NULL),
(729, 1, NULL, NULL),
(729, 2, NULL, NULL),
(730, 1, NULL, NULL),
(730, 2, NULL, NULL),
(731, 1, NULL, NULL),
(731, 2, NULL, NULL),
(732, 1, NULL, NULL),
(732, 2, NULL, NULL),
(733, 1, NULL, NULL),
(733, 2, NULL, NULL),
(734, 1, NULL, NULL),
(734, 2, NULL, NULL),
(735, 1, NULL, NULL),
(735, 2, NULL, NULL),
(736, 1, NULL, NULL),
(736, 2, NULL, NULL),
(737, 1, NULL, NULL),
(737, 2, NULL, NULL),
(738, 1, NULL, NULL),
(738, 2, NULL, NULL),
(739, 1, NULL, NULL),
(739, 2, NULL, NULL),
(740, 1, NULL, NULL),
(740, 2, NULL, NULL),
(741, 1, NULL, NULL),
(741, 2, NULL, NULL),
(742, 1, NULL, NULL),
(742, 2, NULL, NULL),
(743, 1, NULL, NULL),
(743, 2, NULL, NULL),
(744, 1, NULL, NULL),
(744, 2, NULL, NULL),
(745, 1, NULL, NULL),
(745, 2, NULL, NULL),
(746, 1, NULL, NULL),
(746, 2, NULL, NULL),
(747, 1, NULL, NULL),
(747, 2, NULL, NULL),
(748, 1, NULL, NULL),
(748, 2, NULL, NULL),
(749, 1, NULL, NULL),
(749, 2, NULL, NULL),
(750, 1, NULL, NULL),
(750, 2, NULL, NULL),
(751, 1, NULL, NULL),
(751, 2, NULL, NULL),
(752, 1, NULL, NULL),
(752, 2, NULL, NULL),
(753, 1, NULL, NULL),
(753, 2, NULL, NULL),
(754, 1, NULL, NULL),
(754, 2, NULL, NULL),
(755, 1, NULL, NULL),
(755, 2, NULL, NULL),
(756, 1, NULL, NULL),
(756, 2, NULL, NULL),
(757, 1, NULL, NULL),
(757, 2, NULL, NULL),
(758, 1, NULL, NULL),
(758, 2, NULL, NULL),
(759, 1, NULL, NULL),
(759, 2, NULL, NULL),
(760, 1, NULL, NULL),
(760, 2, NULL, NULL),
(761, 1, NULL, NULL),
(761, 2, NULL, NULL),
(762, 1, NULL, NULL),
(762, 2, NULL, NULL),
(763, 1, NULL, NULL),
(763, 2, NULL, NULL),
(764, 1, NULL, NULL),
(764, 2, NULL, NULL),
(765, 1, NULL, NULL),
(765, 2, NULL, NULL),
(766, 1, NULL, NULL),
(766, 2, NULL, NULL),
(792, 1, NULL, NULL),
(831, 4203, NULL, NULL),
(832, 4196, NULL, NULL),
(834, 3744, NULL, NULL),
(835, 3736, NULL, NULL),
(835, 3744, NULL, NULL),
(849, 4196, NULL, NULL),
(850, 4242, NULL, NULL),
(873, 4196, NULL, NULL),
(874, 3731, NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `provider_schedules`
--

CREATE TABLE `provider_schedules` (
  `id` int NOT NULL,
  `provider_id` bigint NOT NULL,
  `day_of_week` int NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_start` time DEFAULT NULL,
  `break_end` time DEFAULT NULL,
  `slot_duration` int DEFAULT '30',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `provider_schedules`
--

INSERT INTO `provider_schedules` (`id`, `provider_id`, `day_of_week`, `start_time`, `end_time`, `break_start`, `break_end`, `slot_duration`, `is_enabled`, `created_at`, `updated_at`) VALUES
(67, 832, 0, '06:00:00', '02:30:00', '13:00:00', '15:00:00', 30, 0, '2026-01-09 21:32:11', '2026-01-19 11:32:22'),
(68, 832, 1, '10:00:00', '22:00:00', '13:00:00', '14:00:00', 30, 1, '2026-01-09 21:32:12', '2026-01-19 11:28:38'),
(69, 832, 2, '09:00:00', '18:00:00', NULL, NULL, 30, 1, '2026-01-09 21:32:12', NULL),
(70, 832, 3, '09:00:00', '18:00:00', NULL, NULL, 30, 1, '2026-01-09 21:32:12', NULL),
(71, 832, 4, '09:00:00', '18:00:00', NULL, NULL, 30, 1, '2026-01-09 21:32:12', NULL),
(72, 832, 5, '09:00:00', '18:00:00', NULL, NULL, 30, 1, '2026-01-09 21:32:12', NULL),
(73, 833, 0, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:01', NULL),
(74, 833, 1, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:01', NULL),
(75, 833, 2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:01', NULL),
(76, 833, 3, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:02', NULL),
(77, 833, 4, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:02', NULL),
(78, 833, 5, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:02', NULL),
(79, 833, 6, '12:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-10 00:30:02', NULL),
(80, 849, 0, '09:00:00', '20:00:00', '00:00:00', '00:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(81, 849, 1, '11:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(82, 849, 2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(83, 849, 3, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(84, 849, 4, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(85, 849, 5, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-11 13:17:47', NULL),
(86, 873, 3, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:52', NULL),
(87, 873, 4, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:52', NULL),
(88, 873, 5, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:52', NULL),
(89, 873, 1, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:52', NULL),
(90, 873, 2, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:53', NULL),
(91, 873, 0, '09:00:00', '18:00:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:53', NULL),
(92, 873, 6, '00:00:00', '23:05:00', '12:00:00', '13:00:00', 30, 1, '2026-01-12 01:53:53', NULL),
(99, 832, 6, '08:00:00', '18:00:00', '13:00:00', '13:50:00', 30, 0, '2026-01-18 11:43:16', '2026-01-19 11:32:22');

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
-- Estrutura para tabela `provider_schedule_exceptions`
--

CREATE TABLE `provider_schedule_exceptions` (
  `id` int NOT NULL,
  `provider_id` bigint NOT NULL,
  `date` date NOT NULL,
  `start_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `end_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_closed` tinyint(1) DEFAULT '0',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `reviews`
--

CREATE TABLE `reviews` (
  `id` int NOT NULL,
  `service_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviewer_id` bigint NOT NULL,
  `reviewee_id` bigint NOT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `services`
--

CREATE TABLE `services` (
  `id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `description` text,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_categories`
--

CREATE TABLE `service_categories` (
  `id` int NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_slug` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `service_categories`
--

INSERT INTO `service_categories` (`id`, `name`, `icon_slug`) VALUES
(1, 'Encanamento', 'droplets'),
(2, 'Elétrica', 'zap'),
(3, 'Pintura', 'paintbrush'),
(4, 'Marcenaria', 'hammer'),
(5, 'Manutenção', 'wrench'),
(6, 'Geral', 'home');

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_conversations`
--

CREATE TABLE `service_conversations` (
  `id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `request_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_dispatches`
--

CREATE TABLE `service_dispatches` (
  `id` int NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_list` json NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `current_cycle` int NOT NULL DEFAULT '1',
  `current_provider_index` int NOT NULL DEFAULT '0',
  `history` json DEFAULT NULL,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `service_dispatches`
--

INSERT INTO `service_dispatches` (`id`, `service_id`, `provider_list`, `status`, `current_cycle`, `current_provider_index`, `history`, `last_attempt_at`, `next_retry_at`, `created_at`, `updated_at`) VALUES
(50, '5f9474b8-d83f-46bf-bb1f-73ee5647cc3e', '[834, 835]', 'failed', 3, 1, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T08:57:54.333Z\", \"provider_id\": 834}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:21:58.457Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:22:30.231Z\", \"provider_id\": 834}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:01.956Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:32.855Z\", \"provider_id\": 834}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:04.429Z\", \"provider_id\": 835}]', '2026-01-11 23:23:33', '2026-01-11 23:54:05', '2026-01-11 08:33:00', NULL),
(51, 'cb7539ff-b44a-4e8f-9ae2-cd1c7ffa7cf3', '[554, 835, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T08:57:54.482Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:21:58.616Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:22:31.080Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:01.990Z\", \"provider_id\": 554}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:33.585Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:05.205Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:36.205Z\", \"provider_id\": 554}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:07.728Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:39.233Z\", \"provider_id\": 528}]', '2026-01-11 23:25:08', '2026-01-11 23:55:39', '2026-01-11 08:54:23', NULL),
(52, 'simulated_1768122377947', '[835, 554, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:21:59.126Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:22:30.079Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:01.711Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:33.228Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:04.363Z\", \"provider_id\": 554}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:36.027Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:07.758Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:38.701Z\", \"provider_id\": 554}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:26:10.374Z\", \"provider_id\": 528}]', '2026-01-11 23:25:39', '2026-01-11 23:56:11', '2026-01-11 09:06:20', NULL),
(53, 'simulated_1768122640439', '[835, 554, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:21:59.298Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:22:30.217Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:01.825Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:33.384Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:04.429Z\", \"provider_id\": 554}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:35.967Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:07.696Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:38.580Z\", \"provider_id\": 554}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:26:10.200Z\", \"provider_id\": 528}]', '2026-01-11 23:25:39', '2026-01-11 23:56:10', '2026-01-11 09:10:42', NULL),
(54, 'simulated_1768123047045', '[835, 554, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"reject\", \"timestamp\": \"2026-01-11T09:18:00.237Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:21:59.434Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:22:30.918Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:02.633Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:23:33.570Z\", \"provider_id\": 554}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:05.108Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:24:36.780Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:07.652Z\", \"provider_id\": 554}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-11T23:25:39.311Z\", \"provider_id\": 528}]', '2026-01-11 23:25:08', '2026-01-11 23:55:39', '2026-01-11 09:17:30', NULL),
(55, '1b03bbff-a2a1-4c70-9935-e281c221f433', '[554, 835, 528]', 'completed', 1, 0, '[]', NULL, NULL, '2026-01-11 09:19:29', NULL),
(56, 'fc47e6b0-c4b4-4a58-88de-3d75c30e8134', '[834, 835, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T03:09:23.446Z\", \"provider_id\": 834}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:21:40.342Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:22:12.492Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:22:43.411Z\", \"provider_id\": 834}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:23:14.967Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:23:46.717Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:24:17.678Z\", \"provider_id\": 834}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:24:49.173Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:25:20.721Z\", \"provider_id\": 528}]', '2026-01-12 04:24:50', '2026-01-12 04:55:21', '2026-01-12 03:08:09', NULL),
(57, 'simulated_1768188496942', '[835, 554, 528]', 'failed', 3, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:21:40.477Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:22:12.047Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:22:43.533Z\", \"provider_id\": 528}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:23:15.071Z\", \"provider_id\": 835}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:23:46.036Z\", \"provider_id\": 554}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:24:17.679Z\", \"provider_id\": 528}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:24:49.296Z\", \"provider_id\": 835}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:25:20.194Z\", \"provider_id\": 554}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T04:25:52.017Z\", \"provider_id\": 528}]', '2026-01-12 04:25:21', '2026-01-12 04:55:52', '2026-01-12 03:28:18', NULL),
(58, 'd749dbf2-b2b0-4930-bd01-6658fdf8104c', '[835, 554, 528]', 'completed', 1, 1, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T06:50:35.714Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-12T06:51:50.047Z\", \"provider_id\": 554}]', '2026-01-12 06:51:15', NULL, '2026-01-12 06:49:59', NULL),
(59, '5519193a-59cf-42f2-96f1-f6d26f875f40', '[835, 554, 528]', 'cancelled_orphan', 1, 1, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T02:22:58.209Z\", \"provider_id\": 835}]', '2026-01-13 02:22:05', NULL, '2026-01-13 02:21:27', NULL),
(60, 'b72be314-156d-497f-9478-848d695b3b07', '[554, 835, 528]', 'completed', 1, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:12:10.924Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:12:42.233Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:13:12.767Z\", \"provider_id\": 528}]', '2026-01-13 13:12:42', NULL, '2026-01-13 13:08:12', NULL),
(61, '2d30cea7-8c6d-49e4-a4d5-83a3f28c0057', '[835, 554, 528]', 'completed', 1, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:22:40.287Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:23:10.459Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T13:23:40.967Z\", \"provider_id\": 528}]', '2026-01-13 13:23:10', NULL, '2026-01-13 13:22:09', NULL),
(62, 'bd8a54b3-6def-4400-8a9d-3d00da753728', '[835, 554, 528]', 'completed', 1, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T15:53:53.526Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T15:54:23.710Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-13T15:54:54.292Z\", \"provider_id\": 528}]', '2026-01-13 15:54:24', NULL, '2026-01-13 15:53:22', NULL),
(63, 'ad39bb9c-e1eb-4207-8c97-2c11b797b29d', '[835, 554, 528]', 'completed', 1, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:55:37.163Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:56:07.336Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:56:37.840Z\", \"provider_id\": 528}]', '2026-01-14 06:56:07', NULL, '2026-01-14 06:55:06', NULL),
(64, 'ad39bb9c-e1eb-4207-8c97-2c11b797b29d', '[835, 554, 528]', 'completed', 1, 2, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:55:37.163Z\", \"provider_id\": 835}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:56:07.336Z\", \"provider_id\": 554}, {\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-14T06:56:37.840Z\", \"provider_id\": 528}]', '2026-01-14 06:56:07', NULL, '2026-01-14 06:55:06', NULL),
(65, 'ac9ae1c2-5ad8-4b1c-ae21-26a77b2772d0', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:04:10.171Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:04:40.342Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:05:10.512Z\", \"provider_id\": 832}]', '2026-01-18 21:04:40', '2026-01-18 21:15:11', '2026-01-18 21:03:39', NULL),
(66, 'ac9ae1c2-5ad8-4b1c-ae21-26a77b2772d0', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:04:10.171Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:04:40.342Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T21:05:10.512Z\", \"provider_id\": 832}]', '2026-01-18 21:04:40', '2026-01-18 21:15:11', '2026-01-18 21:03:39', NULL),
(67, '38d4d88a-8fb4-4141-9590-10e59b10b85b', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:19:49.303Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:20:19.474Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:20:49.642Z\", \"provider_id\": 832}]', '2026-01-18 22:20:19', '2026-01-18 22:30:50', '2026-01-18 22:19:19', NULL),
(68, '38d4d88a-8fb4-4141-9590-10e59b10b85b', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:19:49.303Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:20:19.474Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-18T22:20:49.642Z\", \"provider_id\": 832}]', '2026-01-18 22:20:19', '2026-01-18 22:30:50', '2026-01-18 22:19:19', NULL),
(69, '8b2b736f-8eba-4eb2-9f02-6ba04c7385f9', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T05:09:42.194Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T05:10:12.364Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T05:10:42.538Z\", \"provider_id\": 832}]', '2026-01-19 05:10:12', '2026-01-19 05:20:43', '2026-01-19 05:09:11', NULL),
(70, '0c822ae8-301e-4649-82d5-1f19909b5579', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T15:59:34.311Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T16:00:05.282Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T16:00:36.343Z\", \"provider_id\": 832}]', '2026-01-19 16:00:06', '2026-01-19 16:10:36', '2026-01-19 15:59:03', NULL),
(71, '9c6cea93-d725-48c5-82a0-4333cc18735c', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T18:52:57.938Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T18:53:29.052Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T18:54:00.057Z\", \"provider_id\": 832}]', '2026-01-19 18:53:29', '2026-01-19 19:04:00', '2026-01-19 18:52:26', NULL),
(72, 'bd69095c-2f7c-4bd6-b064-436200db3bb6', '[832]', 'cancelled_orphan', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T20:48:02.380Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T20:48:33.390Z\", \"provider_id\": 832}]', '2026-01-19 20:48:03', NULL, '2026-01-19 20:47:31', NULL),
(73, '9934c260-6af4-4416-9ceb-e72e08d135af', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T21:04:39.829Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T21:05:11.122Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-19T21:05:42.402Z\", \"provider_id\": 832}]', '2026-01-19 21:05:12', '2026-01-19 21:15:43', '2026-01-19 21:04:08', NULL),
(74, '441ae629-3fe2-4957-ac47-6ac6f6c13a4c', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T01:28:09.884Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T01:28:41.179Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T01:29:12.559Z\", \"provider_id\": 832}]', '2026-01-22 01:28:42', '2026-01-22 01:39:13', '2026-01-22 01:27:38', NULL),
(75, 'f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T16:28:35.309Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T16:29:06.732Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-22T16:29:38.089Z\", \"provider_id\": 832}]', '2026-01-22 16:29:07', '2026-01-22 16:39:38', '2026-01-22 16:28:03', NULL),
(76, '888e7434-c181-4242-8ae4-a45cf291f9ee', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:36:46.411Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:37:17.376Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:37:48.286Z\", \"provider_id\": 832}]', '2026-01-23 02:37:16', '2026-01-23 02:47:48', '2026-01-23 02:36:13', NULL),
(77, '808386e1-42f5-4e5e-a6eb-958471c863a6', '[832]', 'failed', 3, 0, '[{\"cycle\": 1, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:44:41.416Z\", \"provider_id\": 832}, {\"cycle\": 2, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:45:12.359Z\", \"provider_id\": 832}, {\"cycle\": 3, \"action\": \"timeout\", \"timestamp\": \"2026-01-23T02:45:43.884Z\", \"provider_id\": 832}]', '2026-01-23 02:45:11', '2026-01-23 02:55:44', '2026-01-23 02:44:08', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_edit_requests`
--

CREATE TABLE `service_edit_requests` (
  `id` bigint NOT NULL,
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
  `decided_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_media`
--

CREATE TABLE `service_media` (
  `id` bigint NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_type` enum('image','video','audio') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_messages`
--

CREATE TABLE `service_messages` (
  `id` int NOT NULL,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_rejections`
--

CREATE TABLE `service_rejections` (
  `id` int NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `service_rejections`
--

INSERT INTO `service_rejections` (`id`, `service_id`, `provider_id`, `created_at`) VALUES
(22, 'simulated_1768123047045', 835, '2026-01-11 09:17:59'),
(28, 'd749dbf2-b2b0-4930-bd01-6658fdf8104c', 835, '2026-01-12 16:20:12'),
(31, '5519193a-59cf-42f2-96f1-f6d26f875f40', 835, '2026-01-13 02:23:58'),
(32, 'b72be314-156d-497f-9478-848d695b3b07', 835, '2026-01-13 13:14:41');

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_requests`
--

CREATE TABLE `service_requests` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` bigint NOT NULL,
  `category_id` int NOT NULL,
  `task_id` int DEFAULT NULL,
  `profession` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_id` bigint DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('waiting_payment','pending','accepted','waiting_payment_remaining','in_progress','waiting_client_confirmation','completed','cancelled','contested') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting_payment',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `price_estimated` decimal(10,2) DEFAULT NULL,
  `price_upfront` decimal(10,2) DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `location_type` enum('client','provider') COLLATE utf8mb4_unicode_ci DEFAULT 'client',
  `arrived_at` datetime DEFAULT NULL,
  `payment_remaining_status` enum('pending','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `contest_reason` text COLLATE utf8mb4_unicode_ci,
  `contest_status` enum('none','pending','resolved') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `contest_evidence` json DEFAULT NULL,
  `validation_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proof_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proof_video` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proof_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `service_requests`
--

INSERT INTO `service_requests` (`id`, `client_id`, `category_id`, `task_id`, `profession`, `provider_id`, `description`, `status`, `latitude`, `longitude`, `address`, `price_estimated`, `price_upfront`, `scheduled_at`, `created_at`, `location_type`, `arrived_at`, `payment_remaining_status`, `contest_reason`, `contest_status`, `contest_evidence`, `validation_code`, `proof_photo`, `proof_video`, `proof_code`, `status_updated_at`, `completed_at`) VALUES
('1ad1f9a6-58cc-4943-9529-d96132cb5178', 531, 1, NULL, 'Barba (Barboterapia)', 832, 'Serviço: Barba (Barboterapia)\nAgendamento de Barba (Barboterapia)', 'accepted', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 150.00, 45.00, '2026-01-23 19:00:00', '2026-01-23 17:30:21', 'provider', NULL, 'pending', NULL, 'none', NULL, '6087', NULL, NULL, NULL, '2026-01-23 17:30:32', NULL),
('441ae629-3fe2-4957-ac47-6ac6f6c13a4c', 531, 1, 100, 'Barbeiro', 832, 'Serviço: Barba Completa\nquero fazer a barba', 'pending', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 40.01, 12.00, '2026-01-22 12:00:00', '2026-01-22 01:27:26', 'provider', NULL, 'pending', NULL, 'none', NULL, '4887', NULL, NULL, NULL, '2026-01-22 01:27:36', NULL),
('808386e1-42f5-4e5e-a6eb-958471c863a6', 531, 1, NULL, 'Barba Simples (Máquina/Navalha)', 832, 'Serviço: Barba Simples (Máquina/Navalha)\nAgendamento de Barba Simples (Máquina/Navalha)', 'pending', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 150.00, 45.00, '2026-01-23 15:00:00', '2026-01-23 02:43:56', 'provider', NULL, 'pending', NULL, 'none', NULL, '1947', NULL, NULL, NULL, '2026-01-23 02:44:07', NULL),
('888e7434-c181-4242-8ae4-a45cf291f9ee', 531, 1, NULL, '4196', 832, 'Serviço: Corte Degradê (Fade)\nAgendamento de Corte Degradê (Fade)', 'pending', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 150.00, 45.00, '2026-01-23 12:00:00', '2026-01-23 02:36:00', 'provider', NULL, 'pending', NULL, 'none', NULL, '3029', NULL, NULL, NULL, '2026-01-23 02:36:12', NULL),
('9934c260-6af4-4416-9ceb-e72e08d135af', 531, 1, 100, 'Barbeiro', 832, 'Serviço: Barba Completa\nquero fazer a barba', 'pending', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 40.01, 12.00, '2026-01-19 22:00:00', '2026-01-19 21:03:58', 'provider', NULL, 'pending', NULL, 'none', NULL, '4731', NULL, NULL, NULL, '2026-01-19 21:04:06', NULL),
('f30f8308-ded6-465f-a764-394d79a71bc0', 531, 1, NULL, 'Corte Social', 832, 'Serviço: Corte Social \nAgendamento de Corte Social', 'accepted', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 150.00, 45.00, '2026-01-23 15:00:00', '2026-01-23 02:55:11', 'provider', NULL, 'pending', NULL, 'none', NULL, '6987', NULL, NULL, NULL, '2026-01-23 02:55:21', NULL),
('f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', 531, 1, 100, 'Barbeiro', 832, 'Serviço: Barba Completa\nquero fazer a barba', 'pending', -5.50757830, -47.46105500, 'Rua Imperatriz, Vila Redenção, Imperatriz, Maranhão', 40.01, 12.00, '2026-01-22 17:30:00', '2026-01-22 16:27:47', 'provider', NULL, 'pending', NULL, 'none', NULL, '1439', NULL, NULL, NULL, '2026-01-22 16:28:01', NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_reviews`
--

CREATE TABLE `service_reviews` (
  `id` int NOT NULL,
  `request_id` int NOT NULL,
  `client_id` int NOT NULL,
  `provider_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `service_tasks`
--

CREATE TABLE `service_tasks` (
  `id` bigint NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `service_tasks`
--

INSERT INTO `service_tasks` (`id`, `service_id`, `name`, `quantity`, `unit_price`, `subtotal`, `created_at`) VALUES
(4294, '9934c260-6af4-4416-9ceb-e72e08d135af', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-19 21:03:58'),
(4295, '9934c260-6af4-4416-9ceb-e72e08d135af', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-19 21:03:58'),
(4296, '441ae629-3fe2-4957-ac47-6ac6f6c13a4c', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-22 01:27:27'),
(4297, '441ae629-3fe2-4957-ac47-6ac6f6c13a4c', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-22 01:27:27'),
(4298, 'f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-22 16:27:47'),
(4299, 'f4074f0b-e7c9-4947-aec0-b1d8da7cc6e8', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-22 16:27:47'),
(4300, '888e7434-c181-4242-8ae4-a45cf291f9ee', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-23 02:36:00'),
(4301, '888e7434-c181-4242-8ae4-a45cf291f9ee', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-23 02:36:00'),
(4302, '808386e1-42f5-4e5e-a6eb-958471c863a6', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-23 02:43:56'),
(4303, '808386e1-42f5-4e5e-a6eb-958471c863a6', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-23 02:43:56'),
(4304, 'f30f8308-ded6-465f-a764-394d79a71bc0', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-23 02:55:11'),
(4305, 'f30f8308-ded6-465f-a764-394d79a71bc0', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-23 02:55:11'),
(4306, '1ad1f9a6-58cc-4943-9529-d96132cb5178', 'Avaliação inicial', 1.00, 50.00, 50.00, '2026-01-23 17:30:22'),
(4307, '1ad1f9a6-58cc-4943-9529-d96132cb5178', 'Mão de obra', 1.00, 100.00, 100.00, '2026-01-23 17:30:22');

-- --------------------------------------------------------

--
-- Estrutura para tabela `system_settings`
--

CREATE TABLE `system_settings` (
  `key_name` varchar(50) NOT NULL,
  `value` json DEFAULT NULL,
  `description` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `system_settings`
--

INSERT INTO `system_settings` (`key_name`, `value`, `description`, `updated_at`) VALUES
('dispatch_config', '{\"max_declines\": 2, \"cooldown_minutes\": 10}', 'Configuration for dispatch logic (declines, cooldowns, etc.)', '2026-01-10 21:00:19'),
('theme_config', '{\"client\": {\"primary\": \"#FFE600\", \"secondary\": \"#EF6C00\", \"background\": \"#FFE600\", \"text_primary\": \"#2E5C99\"}, \"provider\": {\"primary\": \"#FFE600\", \"secondary\": \"#EF6C00\", \"background\": \"#FFE600\", \"text_primary\": \"#2E5C99\"}}', 'App theme colors for client and provider apps', '2026-01-10 23:03:34');

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

--
-- Despejando dados para a tabela `task_catalog`
--

INSERT INTO `task_catalog` (`id`, `profession_id`, `name`, `pricing_type`, `unit_name`, `unit_price`, `keywords`, `active`, `created_at`) VALUES
(98, 4196, 'Corte Social ', 'fixed', NULL, 42.00, 'Duração: 40 min | Faixa: R$ 35-50 | Corte clássico feito na tesoura ou máquina', 1, '2026-01-02 12:05:53'),
(99, 4196, 'Degradê (Fade)', 'fixed', NULL, 45.00, 'Duração: 45-55 min | Faixa: R$ 40-60 | Estilo moderno com transição suave (máquina)', 1, '2026-01-02 12:05:53'),
(100, 4196, 'Barba Completa', 'fixed', NULL, 40.01, 'Duração: 30 min | Faixa: R$ 30-45 | Alinhamento com navalha e hidratação', 1, '2026-01-02 12:05:53'),
(101, 4196, 'Barboterapia', 'fixed', NULL, 50.00, 'Duração: 45 min | Faixa: R$ 45-65 | Barba com toalha quente, massagem e óleos', 1, '2026-01-02 12:05:53'),
(102, 4196, 'Pezinho (Contorno)', 'fixed', NULL, 15.00, 'Duração: 15 min | Faixa: R$ 10-20 | Limpeza rápida apenas nos contornos', 1, '2026-01-02 12:05:54'),
(103, 4196, 'Combo: Cabelo + Barba', 'fixed', NULL, 80.00, 'Duração: 75 min | Faixa: R$ 70-90 | O serviço completo para quem tem pouco tempo', 1, '2026-01-02 12:05:54'),
(104, 4196, 'Camuflagem de Fios', 'fixed', NULL, 40.00, 'Duração: 20 min | Faixa: R$ 35-50 | Cobertura rápida de cabelos brancos', 1, '2026-01-02 12:05:54'),
(105, 4196, 'Sobrancelha (Navalha)', 'fixed', NULL, 20.00, 'Duração: 15 min | Faixa: R$ 15-25 | Limpeza e desenho da sobrancelha masculina', 1, '2026-01-02 12:05:54'),
(106, 4202, 'Corte Masculino (Simples)', 'fixed', NULL, 40.00, 'Duração: 30-45 min | Faixa: R$ 30-50 | Muito comum o uso de degradê', 1, '2026-01-02 15:04:55'),
(107, 4202, 'Corte Feminino', 'fixed', NULL, 70.00, 'Duração: 60 min | Faixa: R$ 50-90 | Geralmente inclui lavagem', 1, '2026-01-02 15:04:55'),
(108, 4202, 'Escova (Brushing)', 'fixed', NULL, 60.00, 'Duração: 50 min | Faixa: R$ 40-80 | Valor varia pelo comprimento', 1, '2026-01-02 15:04:55'),
(109, 4196, 'Barba (Barboterapia)', 'fixed', NULL, 40.00, 'Duração: 30 min | Faixa: R$ 30-50 | Uso de toalha quente', 1, '2026-01-02 15:04:56'),
(110, 4202, 'Progressiva / Selagem', 'fixed', NULL, 185.00, 'Duração: 2h-3h | Faixa: R$ 120-250 | Alta demanda devido ao clima', 1, '2026-01-02 15:04:56'),
(111, 4202, 'Coloração (Só aplicação)', 'fixed', NULL, 60.00, 'Duração: 45 min | Faixa: R$ 50-70 | Cliente geralmente leva a tinta', 1, '2026-01-02 15:04:56'),
(112, 4203, 'Mão (Manicure)', 'fixed', NULL, 35.00, 'Duração: 30-40 min | Faixa: R$ 20-30 | Esmaltação simples', 1, '2026-01-02 15:04:56'),
(113, 4203, 'Pé (Pedicure)', 'fixed', NULL, 35.00, 'Duração: 30-40 min | Faixa: R$ 20-35 | Inclui cutilagem', 1, '2026-01-02 15:04:56'),
(114, 4203, 'Combo Pé e Mão', 'fixed', NULL, 70.00, 'Duração: 1h 20min | Faixa: R$ 50-65', 1, '2026-01-02 15:04:56'),
(115, 4203, 'Alongamento (Gel/Fibra)', 'fixed', NULL, 165.00, 'Duração: 2h-2h30 | Faixa: R$ 100-180 | Manutenção mensal obrigatória', 1, '2026-01-02 15:04:56'),
(121, 4202, 'Hidratação Profunda', 'fixed', NULL, 70.00, 'Duração: 40 min | Faixa: R$ 50-90 | Tratamento', 1, '2026-01-02 15:15:24'),
(122, 4202, 'Luzes / Mechas', 'fixed', NULL, 425.00, 'Duração: 4h 00min | Faixa: R$ 250-600 | Descoloração', 1, '2026-01-02 15:15:24'),
(123, 4202, 'Botox Capilar', 'fixed', NULL, 120.00, 'Duração: 1h 30min | Faixa: R$ 100-150 | Redução de volume e frizz', 1, '2026-01-02 15:15:24'),
(124, 4202, 'Matização', 'fixed', NULL, 50.00, 'Duração: 30 min | Faixa: R$ 40-70 | Neutralização de tons amarelados', 1, '2026-01-02 15:15:25'),
(125, 4202, 'Corte Masculino (Simples/Social)', 'fixed', NULL, 40.00, 'Duração: 40 min | Faixa: R$ 30-50 | Corte clássico tesoura ou máquina', 1, '2026-01-02 21:07:25'),
(126, 4202, 'Corte Degradê (Fade)', 'fixed', NULL, 50.00, 'Duração: 50 min | Faixa: R$ 45-60 | Estilo moderno com transição suave', 1, '2026-01-02 21:07:25'),
(127, 4196, 'Barba (Barboterapia/Toalha Quente)', 'fixed', NULL, 40.00, 'Duração: 30 min | Faixa: R$ 30-50 | Uso de toalha quente e massagem', 1, '2026-01-02 21:07:25'),
(128, 4202, 'Combo Corte + Barba', 'fixed', NULL, 80.00, 'Duração: 1h 15min | Faixa: R$ 70-90 | Serviço completo', 1, '2026-01-02 21:07:25'),
(129, 4203, 'Mão (Manicure simples)', 'fixed', NULL, 25.00, 'Duração: 35 min | Faixa: R$ 20-30 | Esmaltação simples', 1, '2026-01-02 21:07:26'),
(130, 4203, 'Pé (Pedicure simples)', 'fixed', NULL, 30.00, 'Duração: 35 min | Faixa: R$ 25-35 | Inclui cutilagem', 1, '2026-01-02 21:07:26'),
(131, 4203, 'Alongamento (Gel ou Fibra)', 'fixed', NULL, 155.00, 'Duração: 2h 15min | Faixa: R$ 120-190 | Manutenção mensal obrigatória', 1, '2026-01-02 21:07:27'),
(132, 4203, 'Esmaltação em Gel', 'fixed', NULL, 70.00, 'Duração: 50 min | Faixa: R$ 60-80', 1, '2026-01-02 21:07:27'),
(135, 4196, 'Corte Degradê (Fade)', 'fixed', NULL, 53.00, 'Duração: 45 min | Faixa: R$ 45-60 | Técnica degradê', 1, '2026-01-02 21:07:33'),
(137, 4196, 'Corte Masculino (Social)', 'fixed', NULL, 38.00, 'Duração: 30 min | Faixa: R$ 30-45 | Foco em agilidade', 1, '2026-01-02 21:27:21'),
(138, 4196, 'Barba Simples (Máquina/Navalha)', 'fixed', NULL, 30.00, 'Duração: 20 min | Faixa: R$ 25-35', 1, '2026-01-02 21:27:21'),
(139, 4196, 'Barboterapia (Toalha Quente)', 'fixed', NULL, 53.00, 'Duração: 40 min | Faixa: R$ 45-60 | Relaxamento com toalha quente', 1, '2026-01-02 21:27:22'),
(140, 4196, 'Pezinho (Acabamento)', 'fixed', NULL, 18.00, 'Duração: 15 min | Faixa: R$ 15-20', 1, '2026-01-02 21:27:22'),
(141, 4196, 'Pigmentação de Barba/Cabelo', 'fixed', NULL, 40.00, 'Duração: 30 min | Faixa: R$ 30-50', 1, '2026-01-02 21:27:22'),
(142, 4196, 'Combo: Corte + Barba', 'fixed', NULL, 80.00, 'Duração: 1h 10min | Faixa: R$ 70-90', 1, '2026-01-02 21:27:22'),
(143, 4202, 'Corte Feminino (Lavado)', 'fixed', NULL, 80.00, 'Duração: 1h 00min | Faixa: R$ 60-100 | Inclui lavagem', 1, '2026-01-02 21:27:22'),
(144, 4202, 'Escova + Chapinha', 'fixed', NULL, 65.00, 'Duração: 50 min | Faixa: R$ 45-85 | Finalização', 1, '2026-01-02 21:27:22'),
(145, 4202, 'Selagem / Progressiva', 'fixed', NULL, 225.00, 'Duração: 2h 30min | Faixa: R$ 150-300 | Alisamento/Redução de volume', 1, '2026-01-02 21:27:23'),
(146, 4202, 'Coloração (Aplicação)', 'fixed', NULL, 70.00, 'Duração: 1h 00min | Faixa: R$ 60-80', 1, '2026-01-02 21:27:23'),
(147, 4202, 'Cauterização Capilar', 'fixed', NULL, 150.00, 'Duração: 1h 20min | Faixa: R$ 120-180 | Reconstrução', 1, '2026-01-02 21:27:23'),
(148, 4203, 'Manicure (Mão)', 'fixed', NULL, 30.00, 'Duração: 40 min | Faixa: R$ 25-35', 1, '2026-01-02 21:27:23'),
(149, 4203, 'Pedicure (Pé)', 'fixed', NULL, 35.00, 'Duração: 45 min | Faixa: R$ 30-40', 1, '2026-01-02 21:27:23'),
(150, 4203, 'Alongamento em Fibra de Vidro', 'fixed', NULL, 180.00, 'Duração: 2h 30min | Faixa: R$ 130-200', 1, '2026-01-02 21:27:24'),
(151, 4203, 'Manutenção de Alongamento', 'fixed', NULL, 90.00, 'Duração: 1h 30min | Faixa: R$ 80-110', 1, '2026-01-02 21:27:24'),
(152, 4203, 'Banho de Gel', 'fixed', NULL, 130.00, 'Duração: 1h 00min | Faixa: R$ 90-130', 1, '2026-01-02 21:27:24'),
(153, 4220, 'Design de Sobrancelha', 'fixed', NULL, 43.00, 'Duração: 30 min | Faixa: R$ 35-50', 1, '2026-01-02 21:27:24'),
(154, 4220, 'Sobrancelha com Henna', 'fixed', NULL, 60.00, 'Duração: 45 min | Faixa: R$ 50-70', 1, '2026-01-02 21:27:24'),
(155, 4220, 'Limpeza de Pele Express', 'fixed', NULL, 85.00, 'Duração: 40 min | Faixa: R$ 70-100', 1, '2026-01-02 21:27:24'),
(156, 4220, 'Limpeza de Pele Profunda', 'fixed', NULL, 165.00, 'Duração: 1h 30min | Faixa: R$ 130-200', 1, '2026-01-02 21:27:25'),
(157, 4220, 'Depilação de Buço (Cera)', 'fixed', NULL, 20.00, 'Duração: 15 min | Faixa: R$ 15-25', 1, '2026-01-02 21:27:25'),
(158, 4220, 'Extensão de Cílios (Fio a Fio)', 'fixed', NULL, 150.00, 'Duração: 2h 00min | Faixa: R$ 120-180', 1, '2026-01-02 21:27:25'),
(159, 4220, 'Drenagem Linfática (Sessão)', 'fixed', NULL, 115.00, 'Duração: 1h 00min | Faixa: R$ 80-150', 1, '2026-01-02 21:27:25'),
(167, 3731, 'Troca de Fechadura ou Maçaneta', 'fixed', NULL, 49.50, 'Duração: 30-45 min | Faixa: R$ 40-70 | Pequenos Reparos', 1, '2026-01-02 22:08:54'),
(168, 3731, 'Instalação de Trinco ou Olho Mágico', 'fixed', NULL, 36.00, 'Duração: 20-30 min | Faixa: R$ 30-50 | Pequenos Reparos', 1, '2026-01-02 22:08:54'),
(169, 3731, 'Troca de Porta (Apenas a folha)', 'fixed', NULL, 126.00, 'Duração: 1h 30min - 2h | Faixa: R$ 100-180 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(170, 3731, 'Instalação de Porta Completa (Kit porta pronta)', 'fixed', NULL, 315.00, 'Duração: 3h - 5h | Faixa: R$ 250-450 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(171, 3731, 'Ajuste de Porta (Raspando no piso/marcenaria)', 'fixed', NULL, 58.50, 'Duração: 40 min | Faixa: R$ 50-80 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(172, 3731, 'Reparo de Buraco em Alvenaria (Gesso ou Massa)', 'fixed', NULL, 81.00, 'Duração: 1h 00min | Faixa: R$ 60-120 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(173, 3731, 'Troca de Telhas Quebradas (Pequeno trecho)', 'fixed', NULL, 202.50, 'Duração: 1h - 2h | Faixa: R$ 150-300 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(174, 3731, 'Instalação de Prateleiras, Quadros ou Suportes', 'fixed', NULL, 27.00, 'Duração: 20 min | Faixa: R$ 20-40 (por unidade) | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(175, 3731, 'Instalação de Painel de TV (Até 55\")', 'fixed', NULL, 103.50, 'Duração: 1h 00min | Faixa: R$ 80-150 | Pequenos Reparos', 1, '2026-01-02 22:08:55'),
(176, 3731, 'Assentamento de Piso Cerâmico (Comum)', 'fixed', NULL, 40.50, 'Preço por m² | Faixa: R$ 35-55 | Revestimento', 1, '2026-01-02 22:08:55'),
(177, 3731, 'Assentamento de Porcelanato', 'fixed', NULL, 63.00, 'Preço por m² | Faixa: R$ 50-90 | Revestimento', 1, '2026-01-02 22:08:56'),
(178, 3731, 'Reboco de Parede (Acabamento liso)', 'fixed', NULL, 31.50, 'Preço por m² | Faixa: R$ 25-45 | Revestimento', 1, '2026-01-02 22:08:56'),
(179, 3731, 'Assentamento de Tijolo/Bloco (Levantamento)', 'fixed', NULL, 36.00, 'Preço por m² | Faixa: R$ 30-50 | Revestimento', 1, '2026-01-02 22:08:56'),
(180, 3731, 'Troca ou Instalação de Rodapé (Linear)', 'fixed', NULL, 18.00, 'Preço por metro | Faixa: R$ 15-25 | Revestimento', 1, '2026-01-02 22:08:56'),
(181, 3731, 'Rejunte de Piso (Limpeza e aplicação)', 'fixed', NULL, 20.25, 'Preço por m² | Faixa: R$ 15-30 | Revestimento', 1, '2026-01-02 22:08:56'),
(182, 3731, 'Instalação de Soleira ou Pingadeira', 'fixed', NULL, 72.00, 'Duração: 1h 00min | Faixa: R$ 60-100 | Revestimento', 1, '2026-01-02 22:08:56'),
(183, 3731, 'Troca de Sifão, Torneira ou Engate', 'fixed', NULL, 49.50, 'Duração: 30 min | Faixa: R$ 40-70 | Hidráulica', 1, '2026-01-02 22:08:56'),
(184, 3731, 'Reparo de Vazamento em Vaso Sanitário (Descarga)', 'fixed', NULL, 90.00, 'Duração: 1h 00min | Faixa: R$ 70-130 | Hidráulica', 1, '2026-01-02 22:08:56'),
(185, 3731, 'Instalação de Chuveiro Elétrico', 'fixed', NULL, 63.00, 'Duração: 40 min | Faixa: R$ 50-90 | Hidráulica', 1, '2026-01-02 22:08:57'),
(186, 3731, 'Limpeza de Calhas', 'fixed', NULL, 27.00, 'Preço por metro linear | Faixa: R$ 20-40 | Hidráulica', 1, '2026-01-02 22:08:57'),
(187, 3731, 'Desentupimento Simples (Pia ou Ralo)', 'fixed', NULL, 103.50, 'Duração: 1h 00min | Faixa: R$ 80-150 | Hidráulica', 1, '2026-01-02 22:08:57'),
(188, 3731, 'Limpeza de Caixa d\'Água (Até 1000L)', 'fixed', NULL, 193.50, 'Duração: 2h 00min | Faixa: R$ 150-280 | Hidráulica', 1, '2026-01-02 22:08:57'),
(189, 3731, 'Reparo de Rachadura em Parede (Tratamento)', 'fixed', NULL, 103.50, 'Preço por metro | Duração: 1h 30min | Faixa: R$ 80-150 | Acabamentos', 1, '2026-01-02 22:08:57'),
(190, 3731, 'Impermeabilização de Rodapé contra Umidade', 'fixed', NULL, 60.75, 'Preço por metro | Duração: 1h 30min | Faixa: R$ 45-90 | Acabamentos', 1, '2026-01-02 22:08:57'),
(191, 3731, 'Pintura de Teto de Banheiro (Contra mofo)', 'fixed', NULL, 103.50, 'Duração: 1h 30min | Faixa: R$ 80-150 | Acabamentos', 1, '2026-01-02 22:08:57'),
(192, 3731, 'Nivelamento de Piso (Cimentado)', 'fixed', NULL, 38.25, 'Preço por m² | Duração: 2h - 4h | Faixa: R$ 30-55 | Acabamentos', 1, '2026-01-02 22:08:57'),
(193, 3732, 'Instalação de Portas', 'fixed', NULL, 90.00, 'Duração: 1h-2h | Instalação de porta interna ou externa', 1, '2026-01-02 22:21:48'),
(194, 3732, 'Montagem de Móveis', 'fixed', NULL, 72.00, 'Duração: 1h | Montagem de guarda-roupa, armário, etc.', 1, '2026-01-02 22:21:48'),
(195, 3732, 'Reparo de Telhado', 'fixed', NULL, 135.00, 'Duração: 2h | Troca de telhas, eliminação de goteiras', 1, '2026-01-02 22:21:48'),
(196, 3732, 'Construção de Deck (m²)', 'fixed', NULL, 180.00, 'Duração: 4h | Preço por m² estimado', 1, '2026-01-02 22:21:48'),
(197, 3732, 'Instalação de Rodapé', 'fixed', NULL, 45.00, 'Duração: 1h | Instalação de rodapé de madeira ou poliestireno', 1, '2026-01-02 22:21:48'),
(203, 3736, 'Abertura de Porta Residencial', 'fixed', NULL, 54.00, 'Duração: 20min | Sem troca de fechadura', 1, '2026-01-02 22:21:49'),
(204, 3736, 'Troca de Fechadura', 'fixed', NULL, 63.00, 'Duração: 30min | Mão de obra (fechadura à parte ou inclusa se simples)', 1, '2026-01-02 22:21:49'),
(205, 3736, 'Cópia de Chave Simples', 'fixed', NULL, 15.00, 'Duração: 10min | Preço por unidade', 1, '2026-01-02 22:21:49'),
(206, 3736, 'Abertura de Carro', 'fixed', NULL, 108.00, 'Duração: 30min | Abertura técnica sem danos', 1, '2026-01-02 22:21:50'),
(207, 3736, 'Confecção de Chave Codificada', 'fixed', NULL, 225.00, 'Duração: 1h | Chave automotiva com chip', 1, '2026-01-02 22:21:50'),
(208, 3728, 'Troca de Chuveiro', 'fixed', NULL, 81.00, 'Duração: 40min | Instalação elétrica de chuveiro', 1, '2026-01-02 22:51:17'),
(209, 3728, 'Instalação de Tomada/Interruptor', 'fixed', NULL, 45.00, 'Duração: 20min | Preço por ponto', 1, '2026-01-02 22:51:17'),
(210, 3728, 'Troca de Disjuntor', 'fixed', NULL, 120.00, 'Duração: 30min | Substituição no quadro', 1, '2026-01-02 22:51:17'),
(211, 3728, 'Instalação de Luminária/Lustre', 'fixed', NULL, 63.00, 'Duração: 45min | Montagem e instalação', 1, '2026-01-02 22:51:17'),
(212, 3728, 'Visita Técnica (Curto-circuito)', 'fixed', NULL, 90.00, 'Duração: 1h | Diagnóstico de falha elétrica', 1, '2026-01-02 22:51:17'),
(213, 3728, 'Instalação de Ventilador de Teto', 'fixed', NULL, 108.00, 'Duração: 1h 30min | Montagem e fixação', 1, '2026-01-02 22:51:18'),
(214, 3729, 'Troca de Torneira/Misturador', 'fixed', NULL, 45.00, 'Duração: 30min | Troca simples', 1, '2026-01-02 22:51:18'),
(215, 3729, 'Conserto de Vazamento (Simples)', 'fixed', NULL, 90.00, 'Duração: 1h | Cano exposto ou fácil acesso', 1, '2026-01-02 22:51:18'),
(216, 3729, 'Desentupimento de Pia/Ralo', 'fixed', NULL, 108.00, 'Duração: 1h | Desobstrução mecânica', 1, '2026-01-02 22:51:18'),
(217, 3729, 'Instalação de Vaso Sanitário', 'fixed', NULL, 135.00, 'Duração: 1h 30min | Com vedação', 1, '2026-01-02 22:51:18'),
(218, 3729, 'Limpeza de Caixa d\'Água (até 1000L)', 'fixed', NULL, 162.00, 'Duração: 2h | Higienização completa', 1, '2026-01-02 22:51:18'),
(219, 3730, 'Pintura Parede Lisa (m²)', 'fixed', NULL, 18.00, 'Preço por m² | Mão de obra (tinta à parte)', 1, '2026-01-02 22:51:18'),
(220, 3730, 'Pintura de Porta', 'fixed', NULL, 72.00, 'Duração: 2h | Lixamento e pintura', 1, '2026-01-02 22:51:18'),
(221, 3730, 'Aplicação de Massa Corrida (m²)', 'fixed', NULL, 22.50, 'Preço por m² | Preparação de parede', 1, '2026-01-02 22:51:18'),
(222, 3730, 'Pintura de Teto (m²)', 'fixed', NULL, 22.50, 'Preço por m² | Tinta látex/acrílica', 1, '2026-01-02 22:51:18'),
(223, 4242, 'Corte de Grama (até 50m²)', 'fixed', NULL, 63.00, 'Duração: 1h | Roçagem e limpeza', 1, '2026-01-02 22:51:19'),
(224, 4242, 'Poda de Árvore/Arbusto (Pequeno)', 'fixed', NULL, 45.00, 'Duração: 45min | Por unidade', 1, '2026-01-02 22:51:19'),
(225, 4242, 'Limpeza de Jardim (Diária)', 'fixed', NULL, 180.00, 'Duração: 6h | Manutenção geral', 1, '2026-01-02 22:51:19'),
(226, 4242, 'Plantio de Mudas', 'fixed', NULL, 27.00, 'Duração: 20min | Por muda (mão de obra)', 1, '2026-01-02 22:51:19'),
(227, 3735, 'Troca de Vidro Janela (Comum)', 'fixed', NULL, 72.00, 'Duração: 1h | Mão de obra (vidro à parte)', 1, '2026-01-02 22:51:19'),
(228, 3735, 'Manutenção de Box', 'fixed', NULL, 90.00, 'Duração: 1h | Regulagem e vedação', 1, '2026-01-02 22:51:19'),
(229, 3735, 'Instalação de Espelho (Pequeno)', 'fixed', NULL, 54.00, 'Duração: 40min | Fixação na parede', 1, '2026-01-02 22:51:19'),
(230, 3740, 'Solda em Portão/Grade', 'fixed', NULL, 90.00, 'Duração: 1h | Reparo com solda elétrica', 1, '2026-01-02 22:51:19'),
(231, 3740, 'Troca de Roldana de Portão', 'fixed', NULL, 63.00, 'Duração: 1h | Mão de obra', 1, '2026-01-02 22:51:19'),
(232, 3740, 'Instalação de Fechadura de Portão', 'fixed', NULL, 72.00, 'Duração: 1h | Solda e fixação', 1, '2026-01-02 22:51:19'),
(233, 3737, 'Reparo em Forro de Gesso (Buraco)', 'fixed', NULL, 81.00, 'Duração: 1h | Fechamento de buracos e acabamento', 1, '2026-01-02 22:51:20'),
(234, 3737, 'Parede Drywall (m²)', 'fixed', NULL, 45.00, 'Duração: 1h/m² | Construção de parede divisória em drywall', 1, '2026-01-02 22:51:20'),
(235, 3737, 'Instalação de Moldura (metro)', 'fixed', NULL, 13.50, 'Duração: 30min/m | Instalação de molduras de gesso no teto', 1, '2026-01-02 22:51:20'),
(236, 3742, 'Faxina Completa (Diária)', 'fixed', NULL, 162.00, 'Duração: 8h | Limpeza pesada', 1, '2026-01-02 22:51:20'),
(237, 3742, 'Faxina Meio Período', 'fixed', NULL, 99.00, 'Duração: 4h | Limpeza de manutenção', 1, '2026-01-02 22:51:20'),
(238, 3742, 'Passar Roupa (Cesto)', 'fixed', NULL, 72.00, 'Duração: 3h | Até 30 peças', 1, '2026-01-02 22:51:20'),
(239, 3737, 'Instalação de Sanca Aberta (m)', 'fixed', NULL, 45.00, 'Duração: 1h/m | Sanca com iluminação indireta', 1, '2026-01-02 23:05:33'),
(240, 3737, 'Instalação de Sanca Fechada (m)', 'fixed', NULL, 36.00, 'Duração: 45min/m | Sanca rebaixada simples', 1, '2026-01-02 23:05:33'),
(241, 3737, 'Forro de Gesso Acartonado (m²)', 'fixed', NULL, 54.00, 'Duração: 1h/m² | Forro liso estruturado', 1, '2026-01-02 23:05:33'),
(242, 3737, 'Forro de Gesso Plaquinha (m²)', 'fixed', NULL, 36.00, 'Duração: 45min/m² | Forro tradicional de placas 60x60', 1, '2026-01-02 23:05:33'),
(243, 3737, 'Divisória de Drywall com Porta (m²)', 'fixed', NULL, 90.00, 'Duração: 2h/m² | Parede com requadro para porta', 1, '2026-01-02 23:05:34'),
(244, 3737, 'Aplicação de Gesso 3D (m²)', 'fixed', NULL, 45.00, 'Duração: 1h/m² | Instalação de placas decorativas 3D', 1, '2026-01-02 23:05:34'),
(245, 3737, 'Instalação de Cortineiro (m)', 'fixed', NULL, 27.00, 'Duração: 30min/m | Acabamento em gesso para cortinas', 1, '2026-01-02 23:05:34'),
(246, 3737, 'Closet de Gesso (unidade)', 'fixed', NULL, 450.00, 'Duração: 4h-8h | Estrutura básica para closet (prateleiras)', 1, '2026-01-02 23:05:34'),
(247, 3737, 'Estante ou Nicho de Gesso (unidade)', 'fixed', NULL, 180.00, 'Duração: 2h-4h | Nichos decorativos ou funcionais', 1, '2026-01-02 23:05:34'),
(248, 3742, 'limpeza de comodo ', 'per_unit', ' m²', 10.00, 'limpeza casa faxina geral ', 1, '2026-01-09 13:21:46'),
(250, 3744, 'Manutenção de ar condicionado de 09 a 12 Btus', 'fixed', NULL, 200.00, 'Duração: 1hr/ Higienização Completa unidade Interna e externa ', 1, '2026-01-13 16:09:29'),
(251, 3744, 'Manutenção de ar condicionado de 18 a 24 Btus', 'fixed', NULL, 350.00, 'Duração: 1hr/ Higienização Completa unidade Interna e externa ', 1, '2026-01-13 16:12:47'),
(252, 3744, 'Manutenção de ar condicionado de 30 a 36 Btus', 'fixed', NULL, 400.00, 'Duração: 1hr/Higienização Completa unidade Interna e externa ', 1, '2026-01-13 16:15:43'),
(253, 3744, 'Manutenção de ar condicionado de 48 a 60 Btus ', 'fixed', NULL, 700.00, 'Duração: 1hr/ Higienização Completa unidade Interna e externa ', 1, '2026-01-13 16:19:24'),
(254, 3744, 'Instalação de 09 a 12 Btus', 'fixed', NULL, 500.00, 'Duração: 2hr/ ambiente esfriando por completo ', 1, '2026-01-13 16:26:43'),
(255, 3744, 'Instalação de 18 a 30 Btus', 'fixed', NULL, 680.00, 'Duração: 2 hrs/ Ambiente esfriando por completo ', 1, '2026-01-13 16:43:08'),
(256, 3744, 'Instalação de 36 a 60 Btus ', 'fixed', NULL, 1.20, 'Duração: 2hr/ Ambiente esfriando por completo ', 1, '2026-01-13 16:44:51'),
(257, 3744, 'Recarga de Gás r22', 'fixed', NULL, 300.00, 'Duração: 30 minutos/ ambiente gelando bem, em poucos minutos.', 1, '2026-01-13 16:53:47'),
(258, 3744, 'Recarga de Gás r32', 'fixed', NULL, 500.00, 'Duração: 30 minutos/ Ambiente gelando bem, em poucos minutos ', 1, '2026-01-13 16:56:17'),
(259, 3744, 'Recarga de Gás r410', 'fixed', NULL, 380.00, 'Duração: 30 minutos/ Ambiente gelando bem, em poucos minutos ', 1, '2026-01-13 16:57:45'),
(260, 3744, 'Troca de Capacitor ', 'fixed', NULL, 180.00, 'Duração: 1hr', 1, '2026-01-13 18:13:02'),
(261, 3744, 'Troca de Sensor ', 'fixed', NULL, 180.00, 'Duração: 1hr.', 1, '2026-01-13 18:13:56'),
(262, 3744, 'Recarga de Gás Geladeira ', 'fixed', NULL, 380.00, 'Duração: 1hr e meia..Sua Geladeira gelando Bem.', 1, '2026-01-13 22:43:12'),
(263, 3744, 'Troca de relé da Geladeira ', 'fixed', NULL, 180.00, 'Duração: 30 minutos.', 1, '2026-01-13 22:44:37'),
(264, 3744, 'Troca de Sensor da Geladeira ', 'fixed', NULL, 250.00, 'Duração: 1hr.', 1, '2026-01-13 22:46:08'),
(265, 4274, 'Serviços no Geral', 'fixed', NULL, 280.00, 'Duração: 1hr ', 1, '2026-01-14 17:14:49'),
(266, 4274, 'Escolta de Valores ', 'fixed', NULL, 300.00, 'Duração: 1hr ', 1, '2026-01-14 17:15:38'),
(267, 4274, 'Segurança Particular ', 'fixed', NULL, 250.00, 'Duração: 1hr ', 1, '2026-01-14 17:16:15'),
(268, 4274, 'Segurança Privada ', 'fixed', NULL, 300.00, 'Duração: 1hr.', 1, '2026-01-14 17:17:21'),
(269, 4275, 'Manutenção fugão Industrial ', 'fixed', NULL, 365.00, NULL, 1, '2026-01-14 17:22:35'),
(270, 4275, 'Manutenção fugão 5 Bocas', 'fixed', NULL, 220.00, NULL, 1, '2026-01-14 17:24:15'),
(271, 4275, 'Fogão Cooktop', 'fixed', NULL, 165.00, NULL, 1, '2026-01-14 17:24:47'),
(272, 4276, 'Logomarcas', 'fixed', NULL, 80.00, 'Duração:2 hrs.', 1, '2026-01-15 17:32:13'),
(273, 4276, 'Post para rede Social ', 'fixed', NULL, 45.00, 'Duração: 1hr', 1, '2026-01-15 17:34:01'),
(274, 4276, 'Cartão de Visita ', 'fixed', NULL, 200.00, 'Duração: 2hr', 1, '2026-01-15 17:34:47'),
(275, 4277, 'Garson', 'fixed', NULL, 220.00, 'Duração: 6 HR.', 1, '2026-01-15 17:46:35'),
(276, 4278, 'Motorista particular ', 'fixed', NULL, 100.00, 'Duração:1 hr', 1, '2026-01-15 17:51:11'),
(277, 4278, 'Motoqueiro Particular ', 'fixed', NULL, 40.00, 'Duração: 1hr', 1, '2026-01-15 17:52:11'),
(278, 4279, 'G. Roupas Médio ', 'fixed', NULL, 85.00, 'Duração: 1 hr', 1, '2026-01-15 18:04:01'),
(279, 4279, 'G. Roupa Casal', 'fixed', NULL, 165.00, 'Duração: 3hr', 1, '2026-01-15 18:05:14'),
(280, 4279, 'Cozinhas', 'fixed', NULL, 135.00, 'Duração: 3hrs', 1, '2026-01-15 18:06:02'),
(281, 4279, 'Quite', 'fixed', NULL, 115.00, 'Duração: 1hr ', 1, '2026-01-15 18:06:38'),
(282, 4279, 'Cômodo P.', 'fixed', NULL, 75.00, 'Duração: 1hr ', 1, '2026-01-15 18:07:28'),
(283, 4279, 'Cômoda G.', 'fixed', NULL, 115.00, 'Duração: 1hr ', 1, '2026-01-15 18:08:14'),
(284, 4279, 'Berço normal ', 'fixed', NULL, 65.00, 'Duração: 1hr ', 1, '2026-01-15 18:09:12'),
(285, 4279, 'Americana', 'fixed', NULL, 95.00, 'Duração: 1hr ', 1, '2026-01-15 18:09:53'),
(286, 4279, 'Painéis M.', 'fixed', NULL, 115.00, 'Duração: 2hr', 1, '2026-01-15 18:10:37'),
(287, 4279, 'Painéis G.', 'fixed', NULL, 165.00, 'Duração: 2hrs', 1, '2026-01-15 18:12:09'),
(288, 4279, 'Reparos de portas Assistência Básica ', 'fixed', NULL, 65.00, 'Duração: 1hr ', 1, '2026-01-15 18:13:28'),
(289, 4279, 'Reforma média ', 'fixed', NULL, 135.00, 'Duração: 1hr ', 1, '2026-01-15 18:14:17'),
(290, 4279, 'Cortinados', 'fixed', NULL, 55.00, 'Duração: 1hr ', 1, '2026-01-15 18:15:06'),
(291, 4279, 'Suporte de TV 60 P.', 'fixed', NULL, 120.00, 'Duração: 2hr', 1, '2026-01-15 18:24:18'),
(292, 4279, 'Suporte de TV 65 P.', 'fixed', NULL, 150.00, 'Duração: 1hr ', 1, '2026-01-15 18:25:20'),
(293, 4279, 'Suporte de TV 70 P.', 'fixed', NULL, 150.00, 'Duração: 1hr ', 1, '2026-01-15 18:26:00'),
(294, 4279, 'Suporte de TV 85 P.', 'fixed', NULL, 165.00, 'Duração: 1hr ', 1, '2026-01-15 18:26:47'),
(295, 4279, 'Suporte de TV 98 P.', 'fixed', NULL, 170.00, 'Duração: 1hr ', 1, '2026-01-15 18:27:55'),
(296, 4280, 'Design com pinça ', 'fixed', NULL, 30.00, 'Duração: 1hr', 1, '2026-01-15 21:55:17'),
(297, 4280, 'Design com cera', 'fixed', NULL, 25.00, 'Duração: 1hr ', 1, '2026-01-15 21:56:00'),
(298, 4280, 'Design com henna', 'fixed', NULL, 35.00, 'Duração: 1hr ', 1, '2026-01-15 21:56:36'),
(299, 4281, 'Rosto completo ', 'fixed', NULL, 35.00, 'Duração: 1hr ', 1, '2026-01-15 21:58:06'),
(300, 4281, 'Queixo', 'fixed', NULL, 12.00, 'Duração: 1hr ', 1, '2026-01-15 21:59:15'),
(301, 4281, 'Buço ', 'fixed', NULL, 12.00, 'Duração: 30 minutos ', 1, '2026-01-15 21:59:59'),
(302, 4281, 'Nariz femenino', 'fixed', NULL, 11.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:01:19'),
(303, 4281, 'Nariz masculino ', 'fixed', NULL, 13.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:02:12'),
(304, 4281, 'Axilas femenino', 'fixed', NULL, 20.00, NULL, 1, '2026-01-15 22:03:08'),
(305, 4281, 'Axilas masculino ', 'fixed', NULL, 25.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:03:58'),
(306, 4281, 'Virilha biquíni ', 'fixed', NULL, 30.00, 'Duração: 1hr ', 1, '2026-01-15 22:04:41'),
(307, 4281, 'Virilha cavada', 'fixed', NULL, 40.00, 'Duração: 1hr ', 1, '2026-01-15 22:05:18'),
(308, 4281, 'Virilha total', 'fixed', NULL, 45.00, 'Duração: 1hr ', 1, '2026-01-15 22:05:51'),
(309, 4281, 'Perianal ', 'fixed', NULL, 12.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:06:41'),
(310, 4281, 'Meia perna ', 'fixed', NULL, 30.00, 'Duração: 1hr ', 1, '2026-01-15 22:07:07'),
(311, 4281, 'Coxa', 'fixed', NULL, 35.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:07:45'),
(312, 4281, 'Perna completa ', 'fixed', NULL, 55.00, 'Duração 1hr ', 1, '2026-01-15 22:08:28'),
(313, 4281, 'Pés ', 'fixed', NULL, 10.00, 'Duração: 20 minutos ', 1, '2026-01-15 22:09:04'),
(314, 4281, 'Faixa', 'fixed', NULL, 15.00, 'Duração: 30 minutos ', 1, '2026-01-15 22:10:13'),
(315, 4281, 'Nádegas ', 'fixed', NULL, 35.00, 'Duração: 1hr ', 1, '2026-01-15 22:10:48'),
(316, 4281, 'Costas completa ', 'fixed', NULL, 50.00, 'Duração: 1hr ', 1, '2026-01-15 22:11:18'),
(317, 4281, 'Meia costa ', 'fixed', NULL, 27.00, 'Duração: 1hr ', 1, '2026-01-15 22:11:54'),
(318, 4282, 'Interfone', 'fixed', NULL, 220.00, 'Duração: 1hr ', 1, '2026-01-15 23:18:38'),
(319, 4282, 'Cerca elétrica 30 reais o metro ', 'fixed', NULL, 30.00, 'Duração: 3hrs', 1, '2026-01-15 23:19:36'),
(320, 4282, 'Motor rosse ', 'fixed', NULL, 800.00, 'Duração: 1hr ', 1, '2026-01-15 23:21:12'),
(321, 4282, 'Motor jetflex rápido ', 'fixed', NULL, 1500.00, 'Duração: 3hrs', 1, '2026-01-15 23:22:25'),
(322, 4282, 'Câmera ', 'fixed', NULL, 130.00, 'Duração: 1hr ', 1, '2026-01-15 23:22:54'),
(323, 4282, 'Manutenção da câmera ', 'fixed', NULL, 150.00, 'Duração: 1hr ', 1, '2026-01-15 23:23:37'),
(324, 4282, 'Visita técnica ', 'fixed', NULL, 100.00, 'Duração: 1hr ', 1, '2026-01-15 23:24:26'),
(325, 4283, 'Vulcanização ', 'fixed', NULL, 70.00, 'Duração: 1hr ', 1, '2026-01-15 23:25:51'),
(326, 4283, 'Remendo', 'fixed', NULL, 35.00, 'Duração: 1hr ', 1, '2026-01-15 23:26:18'),
(327, 4283, 'Troca de óleo ', 'fixed', NULL, 10.00, 'Duração: 1hr ', 1, '2026-01-15 23:26:51'),
(328, 4283, 'Taxa deslocamento ', 'fixed', NULL, 25.00, 'Duração: 1hr ', 1, '2026-01-15 23:27:47'),
(329, 4284, 'Volume Brasileiro ', 'fixed', NULL, 100.00, 'Duração:1hr ', 1, '2026-01-20 17:10:02'),
(330, 4284, 'Volume 3D', 'fixed', NULL, 110.00, 'Duração: 1hr.', 1, '2026-01-20 17:11:07'),
(331, 4284, 'Efeito Fox', 'fixed', NULL, 120.00, 'Duração: 1hr ', 1, '2026-01-20 17:11:43'),
(332, 4284, 'Efeito Serena', 'fixed', NULL, 95.00, 'Duração: 1hr ', 1, '2026-01-20 17:12:11'),
(333, 4284, 'Volume Egípcio 4D', 'fixed', NULL, 110.00, 'Duração: 1hr ', 1, '2026-01-20 17:12:55'),
(334, 4284, 'Volume Glamourosa 5D', 'fixed', NULL, 120.00, 'Duração: 1hr ', 1, '2026-01-20 17:13:42'),
(335, 4284, 'Volume 6D', 'fixed', NULL, 125.00, 'Duração: 1hr ', 1, '2026-01-20 17:14:15'),
(336, 4284, 'Mega camping 4D', 'fixed', NULL, 140.00, 'Duração: 1hr ', 1, '2026-01-20 17:15:31'),
(337, 4284, 'Volume Russo 6D Copping', 'fixed', NULL, 150.00, 'Duração: 1hr ', 1, '2026-01-20 17:16:38'),
(338, 4284, 'Remoção ', 'fixed', NULL, 30.00, 'Duração: 1hr ', 1, '2026-01-20 17:17:20'),
(339, 4284, 'Manutenção Volume Brasileiro ', 'fixed', NULL, 85.00, 'Duração: 1hr ', 1, '2026-01-20 17:18:17'),
(340, 4284, 'Manutenção Volume 3D', 'fixed', NULL, 95.00, 'Duração: 1hr ', 1, '2026-01-20 17:18:55'),
(341, 4284, 'Manutenção Efeito Fox ', 'fixed', NULL, 100.00, 'Duração: 1hr ', 1, '2026-01-20 17:19:39'),
(342, 4284, 'Manutenção Efeito Serena ', 'fixed', NULL, 80.00, 'Duração: 1hr ', 1, '2026-01-20 17:20:23'),
(343, 4284, 'Manutenção Volume Egípcio 4D', 'fixed', NULL, 100.00, 'Duração: 1hr ', 1, '2026-01-20 17:21:13'),
(344, 4284, 'Manutenção Glamourosa 5D ', 'fixed', NULL, 100.00, 'Duração: 1hr ', 1, '2026-01-20 17:21:56'),
(345, 4284, ' Manutenção Volume 6D', 'fixed', NULL, 110.00, 'Duração: 1hr ', 1, '2026-01-20 17:22:56');

-- --------------------------------------------------------

--
-- Estrutura para tabela `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint NOT NULL,
  `service_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('deposit','final_payment','payout','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','success','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `provider_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Despejando dados para a tabela `users`
--

INSERT INTO `users` (`id`, `firebase_uid`, `email`, `password_hash`, `full_name`, `role`, `phone`, `avatar_url`, `created_at`, `is_verified`, `avatar_blob`, `avatar_mime`) VALUES
(528, 'dUrEku9zsaSMQL9CGAnR2dB7nIA2', '103@gmail.com', 'firebase_oauth', 'test1', 'provider', '(86) 86786-7867', NULL, '2025-12-30 17:58:26', 0, 0x524946460a0d00005745425056503820fe0c0000d035009d012a800080003e6d2a9045a4222197cb9ee44006c4b60066490d703f273ebff97bed0352fec7f8abd59f70b19eed0ff9ff73bf357d0d7e90f600fd48e967e603f6b7d677d137f6cf504feb5fed7ac9fd003cb5bf72fe0f7fb1ffbdfda9f80cfd79fff3ad11d63ed5ffd8f883e487e01edcf253e9df32fea66365fe0f817b58ffa1deefb43e811ed3fd33fde7a8fccc9577a007f38ff09e88b9f2fa8bf66fe017f5bffe77ae8fb0dfdcaf676fdaa58e5b7cf0108f1efe4429508224b73f243d0167b5d826b3110edafc09b9ce466cca36e7ee0b19e4572c2aec2b830755ab321873640a7fb6933342cf880c6ea12e61d41bf5f3d3cc12b0ff66b509c38a6738aa1f0746090168b8944dccaddcf3d2192680931df2577e3ecbd860bda3bf84b35ec99ffbfecfce145104edf8d9ceeab643d45c867a3578b9ec2e97330ae57aa807c0a1972c54f38d337505540a176bd871335b9f3c1ad5a693a98eb515ef7722035d1a9f9fc99123c39397fd3424b0700cc8e38692e21cb5948e12816840a01043bb6fb388c29d88e9dc32a0fabd01525ab9fc7a05023473d355dfb94a39be6ccfa7e1ec97b102f0ff461f0c3f423798bb9b580000fefd767ab885452ac463af5df850c6027a83b6ad98ac3c84e04086bc09dc1eaee18ac5a9cf8054c76101f20541cd06e42a82ff68c78fca37f71bdf0676cba0a8eb63dd86e5a5d257ce17751d347e74c405f24ecd15f063556b146dff90cae346d1cc886cf7cbcf99f000ed72eb7124c08467d3b3ff238fc026ab3464d031592f18f24311835c086ae935e3ac3368f6017cb0a67240ab4172c7fb9d35b62eef3815b5077961553651531adfdcf4992aba32d9a8cad1067548816d56aa82017b4bcd8ed9bc769181ac730430f8b3f658ad5258634d2ae036e3ab6287ab051de11b87fe154243913a3dda6bcb1aa3fdca7dabbffdd6138b593c626e1addea788d985f2c16d3ccf7e85def15ae7d1655a979b110a7cdb020d6905fedd03ac13fc39861f8775a8084c3f2943b477dfd8d70736fac38b80b6b88e17351c9415bd2c30b9ef2179e7a6627233b4587f0b8a73504b2597baf3caf83921b33abfe2ab2cdcb1fb346644c146242f36ec6690ad2b6899579d4195f5f79aed02e0fd356ef45f460e052d221906aef250265bea487012044a87d51280e3764902e8e7a0c56a71fcfe854ffc2d1c9452e3cb9cc8f38336ae1abff79e7a7d982dbb56122786d974be4ddba380986e55d1cd32f5a86012a38ae8032d3041fa0713c56c328eeaf1ccc2484c0a19094f598cf3267f2a5d17d42e8a0dd3132eb3d7b9fe365d4ca2b1d798cae7f42a3e63e0a5fc22aa8b35f32bed1ce3faab3300ddedb5ee3e5a860a8e077bbfac183cf07e1e88b255e48eba234c6727d223ed7819f0ecbbee949d050f151f476f1df618adc0b7874716169deca0c1430c4a4778c207607395c07643e7b21a5562a0f7ad733674adb4f1105111ab6dc90b48d78dafd997643eada9ba94d746869e7784ee0b6bc052af170a3fcc8e7300ee242f85a9f119af58185a3e98e37004b2b10ca00b0be9aa0efd0cbf466024c7c59430b904af3b08d49fcbab1868af4d8b6d765f96940e7725431e2576c8b514bc97f374770be351a96bc25f8fa9edde3003fc536191fbc5c3dd876189950e474afce1fc374c361111d378416cc1d3d242fc5c11f5ab6cf51e33b16f0d6fcd2268498ffc3c8d064bf96dd75c4a581d3055b60c68bf3d47eaea9c2fea9585c7f61386d2c22824a70ac9b951ead4f09ca3c41a56172a6b2392c8c1415b1ac09bd71959d4814fa4b75be4dab0c90511d4421fe72d43f55a9e4d54527bd17320683d3595fc1f0d446d14290927febacc44c966634567e49fb03c78b70b9a43cea00f7a2678994a538d131920c69fedcb91776a437020e3e58c4b33f9968d8cb59beb23cb62363bddf0b86ff02b7da13b122bbba4d64c71854a7e9630907c51d7e8869fcd3fdaadc2c43960260a19ec93dff7d08e5360b223fd39e3bd6a1dbf2058d933ebac715bfc9cba3ec04f74f8df606dfe9b3a0a7441b958465829fe1610b1cdad21ef9a0e777d4d128dc6e6a5b43dceb502c9b9b5c79b8f6c1ddbe83cd71b92aeb95e53366cab8cc73a858277cc21a60e6969a526f47cb0c2a6e8562de3d7b3ccf864fac62beb65462865f1b4587a1c5f23732d62ff5caf5ada266a9f199d166b30adf1af7112f2800dac8417f76ec6a63d8063ee1174d19dee41ee1751edfba69fd51233ee330a047f6c2803eafcc3b6757b0da8f20c78fedb95cafc47b21c2beb1ea18884cf8ca134246a4fe182274156092cfaf034e5c099bfd7f7ef0b933325b276210fd0fcd9a8a4ad50ba0fa7a022e3595d253b83587e5b73ea929a0077c95e7b687d4a2bdedd8cf080212e43b798e11ed5db333c33609460deec56091ca9afc0d7a07f131e3c778ffb087787a0678cf0ff1cbd6d91200617dbebb0497d5120781e085dbfd147103ea9764c19de5effab2c0707647f6609c63fd8c3bc551a4393ae43e199fff2c5659a9fc5a7731654a32f3ded932e76ab7e5f031a59651c95e48412a9f18f9d77d9c52fb9dc127c2d9193489e12bffea84181d1edf9318afc4efd45ff1adec5dc3ebccdb0b09d2ff46a1325f8bab9ce7c314e82713aae6ac8515aade11351676b77f59cc604140059165efcc3e1d3858f12d9d6b5e7e1c59739436b019f1f05f1daea8c0e7547beac861a0e1b288ca5ec48fbc96edf3714eef5a8f60244fc06a09b13e0136f3a00e68282022b6d882607b3ab9d2f0bda19976f566d36239244fdb4673c690c558fd95c8cb38f82214ca063de3b2723d5f5fde4e4c08c0c1c18b50000eb27ebfd8711e56ee43ed4f9088f48867bb3a65fe19bfcd0f67b3b0443678b18ef9e032173425100ff04e0454bdbe67045c31bd3ad318b42db4f0f4e1a1267c5b9db356e22ef9f15b5c7fc35a2db8bebaa2029aaecddb1e76c3318dd19f2fe7ff387f486a70c7dc06740892b5799335973a56b5e3fe36568211df2d23cc869cf0de03228227fe38ae4bec698592fff567c67fa9d8d7423eeec630779834ac80ede2a3ed6dc4cfc4df9232e7342377c8de0884a9b4e2c7dbcf6d4d730ba83a1a47a89ebee5c6b931bf9b53f1bc2c8fb874e53fa60706e0f4265dfc3d2b7d9037c7cb09870e515abc28151a23ca97959b776122ea3d62338e959b81c41ac423a19f6b6e16d64c4ad07acd1791a5db36696bf70fb210bfa356613b40eba99193d9a8cc8f7daa890e18bc7801b88cc83c65f5d8e169c10074ab37e6af91ee53ef66a5eec202ebc761383fb732afbf138b89164a7704b24f857e48f1c409448dd90583cde4278f9ecdde389b14dae13fa0c0b809961e578a01c5387a8ea3134d492cbf2f55da4908ffe02092f5163ff3ecae4875bcfc201957e0e78ee93519eab967fc4e5a1e100a8e26d669f957389f3f6d1816db1d227070f77e05a5823ebca70d5e6dc1600a57e52787b8b3bac2e0ae39fa099bb489f030c5de1b03c259ae0d6e1f70d75ed36042bad4af3f2c0144381761251726642b4cf1bc58a368f1626e016ffc00848708510d17acdbfb22102fe979dacaac4b7246aff62060e2386e85597dc90214fae8eaa927a8176002eaae0c6004d788b957a1732275d94cce5f7d3d1e848b00865b17c5508494e648a8d74ad3392940340d7f528aec36ba6ae7871b37045e8bd273133fe45b05d0b4f9a565e0a07350b7d33c506b719423ece416ae9be8d03cd895fd186dd565661fabdd2eeebed793c1f0fcbc7fbf156d217b46e0e13c3464968e0de0a18b93a15401b62bfb4d98155c4444e3833f0045dd0e6be1ac5c45c755a8f353c24a8fe734c9eca2962ed046a2fb086b1622a01d2cd242404b0ad5dd67d553e73ccfa8a7e4309e7c3088b3da5a381f3a63a2179b64dd063a97e040886ad21b4f9b1aa8d3b9260c710650c24cad54e28258929cf269761755109757084798f1afa03e5a925ad786df9dfe95f744d8ec7b80401bd08435874368bcf80032e181b22f4c5ebc8fdd963cb035d20b174bdac2e2e17ea07a2fe67846b42406c5623fff4d155f1b9695a0659d2b6ae6e42a8d52f36b2d624c5428a49e43d0bd4f7effb17fcb988efcd7a1cd49e7375aefd4cdfbcdc9b26af6c078a114397eb79021340d30ab36cee579fac62ce046915d5cc457dbe965c0ff183be4f1ec1db11591163349764988a6759ca88b45aa105b5b47fc49fea8209d453b1cbd7657c43b7c955bd9dec6b1790e1ef04de39932bf762102078c24c3ea6f608821f8cdf3cdf65f5a44b7e7a3f3cdc8fa2751e9fc9de38587b4f914ffdcea12f00f1f55dc1aa536470347db3019e5864bab360f82ca114c683d95c2d7481fbdadc1d0f1fec3f404cdf4df7e1d415e6db112b48305ff289408c28da7a96318f9bb083f60a3878e24cf6af7a689c7eac33c3a5b8dccc3770943946de9a89a7609e622597eee5c0f48b5490cbf1f9165e5d88090c72c7c6034ebd05be025edb27baae96974b840813474ab14a76aab71f66d41bc76470b58dc295bcb0dd0ed00596c98e0fd930769c87e86e18eaf88560e931aa7375f7fb7f19b0f8161ba34d635e083e318699d02ba395a42b725788100eb981e3554d2622b2934e1b9467b8280f88a8dbe87000000, NULL),
(531, 'UuyiIFbDJbawbK39mC7MMYHybIj1', '105@gmail.com', 'firebase_oauth', 'lima', 'client', '(95) 98989-8959', NULL, '2025-12-31 00:09:39', 0, NULL, NULL),
(543, 'UfreOG3mYcaGlOHwLrSlzDk2QEI3', 'lidianosantos12345@gmail.com', 'firebase_oauth', 'lidiano Santos Barbosa', 'client', '(99) 98482-9608', NULL, '2025-12-31 22:12:32', 0, NULL, NULL),
(832, '7kjf2J62g5a7Ki9SiXZaKwS8ORg1', 'barba@gmail.com', 'FIREBASE_AUTH', 'dono do barba', 'provider', '(88) 88888-8888', NULL, '2026-01-09 21:32:10', 0, 0x52494646ac0400005745425056503820a0040000701b009d012a800080003e6d2e9447242222212c914b78800d896300d2e661361f0bdc6c74f56b0b5e97f95f283bf195630238d1efe6f0ef3cbe81f9cd7a6bd80ff5bfd303d83fa181032ebf2fad97bd7547c603d5dbe248353cfd28403b30bdcc9955cc61b8d1da202dcb8a593bfe03fad07e5c8c3a161f417e60c0c608af648949d32760289bd02d9effeb3055173ea84e10cdad70dedfcf5140e1fada5dc9f847b608429c1a6eec516f51fc63aaa85bfd2c4829161e7316a09d2f32e3d06484882866f5506d8d8bbd779284aef346bda013b432a5313004d0b8c40b778c673e8c390000fef0c40bff9827f5fbf5fbd30776282554000490004087e981b48ee34826d8e029c78a92f975f52c054e057c7f491a87f47b908b282161486bac9790452d12b37c2c11ba3547c9e17ce5785ba2b2ba8bd8ed91376873770c78c83175e65f5bccfba2b881d5f861d3b7a3c3540b0fe183f451877aa1162e3ee785e5feeb0bf47382134009a772d04c573c54f6c7b76fb1e0a88c9d99e6515fbeaa946af2145adac1ba7ffff48cfb54144bf436c882fe55a1f702732a93b5c2e4701532a86e1670f0dbb5767f968d6336b37ddc1fd8d4e34cf7a3126172cb3bb3905ab728705cb8deef4a958ff6818fe964f4c5e7c0640309f0b61df0580574e60d3dc25a431a694f02ef94bbe2d18c5e4cf06455dbbeede2763a7700dfef32d9889e67fbf7d753681a60eac1fe0d39abd8b667a2f88d445753ec2057c177f893a342bce20f618ffe24efda4272fbb63f80fe65cc73598e864878ecf3f380a4cbeb5d6fc7712be10e7df86fbef6d7bdc5041aa3cf6ca934377f4ba1add4c1c61377b8b8aa641708e296483377450b1e62593a95f2fc985bc598dad531d717c66e914ca47b76ccf1f1d9c034d517b25f75871fddcaf4d2b38185ee714565a9325170bdd03fe366d1afc14e4f3c6ffe0d1e91f4ddd17e5d30c59c06e794e8d2ea8161271674f252498c879f2c1e8b6a98d089ccbdd45965790e5236f3ecf0b76fb28fbd76d8f26787bfced6d467af883a76a661e1c84600819ee4f28445395ab9f89c1c4c12c70c250fa9d015acc36f8599f5a807a65b8de9f07f937a9df5798ff824c5c4af6a8cd17febf74abe7b3a157b25537822424bfbb7ab9667085bb4312a306dbf590cf2a9eee85af08a48f8ed6e27163e7dffdd4f686305ab1d48550f9bca3169039caf8fa5410d476b56f88aef9fc63ee162b8dedf6900f60cd950780af2f680e27ce40f717dd4cb492cef087c39da90352a417e13b9ba8d7a0985c320c08c6082d99636dffa0efc24e76027bc01169b9f46ca12cfa503636271396d04965c40f8593ba6333d1efb1e60b8932172e89115f29ebf59208ecdc67a6716455f6784752278b12c95bf681e0b5a645abcab4936f5b5ed83c159fd7b765157412ec73a787df74e89a3b34526b00a4c37bb2e398b1f65359f0fd593a0846c5d7b65df8e97cc8b0f024ed0faef7f4c85868e376101e455e64a6cfd3cacef6c75bc52e4fc0f48d1c49024cdf0cbc0335bf017a666137d76a8a8f360ca77febbf7a6116a5cd9550e2cb48c1828c4d4152dd10bd460318131c8d8d100d3d2805e4afaed1ef23b9906940cfd500bb9d248606655d3b110e24dd145d2f2313901d220000000, NULL),
(833, 'NDU3llLYndOdKs4neDfqh37PGyr2', 'cabelo@gmail.com', 'FIREBASE_AUTH', 'cabelo', 'provider', '(98) 09090-9809', NULL, '2026-01-10 00:30:00', 0, NULL, NULL),
(834, 'hxnrP7t0MvSupIURtHsYS1x7meC3', 'refri@gmail.com', 'FIREBASE_AUTH', 'tecnico refrige', 'provider', '(85) 93847-5938', NULL, '2026-01-10 00:46:41', 0, NULL, NULL),
(835, 'aQ6YeJRWwCTPiBLbTTl9PCp1ahk2', 'chave@gmail.com', 'FIREBASE_AUTH', 'chaveiro silva', 'provider', '(89) 87987-9879', NULL, '2026-01-10 00:47:55', 1, 0x52494646fc0900005745425056503820f0090000102f009d012a800080003e6d309347a422a1a12a93db88800d89642cc00388f7057cfa89fa4f39fb57f6bddc9385613f547b693cc07f1bff1ffb45eecffe8bf667dc5f9307abeffb8f62efed5fef7d803f5c7d36bf713e0effc3ffc4fdc9f80dfda9ffe7ec01e801d4ceacbfb57e3af5dc791bd9efc64cd12f7ffc9dfe89ed57fa0f1678017aabfc1fe537118000fc6ff92ffb2fb73f494fe8bf127dc0fabbe84ff9c7f84e3f4f00f600fe7bfd6ffddff70fc4ffa4ffe5fc63fe71fe67d81bf9cff5fffb7d86bd254e7f1b82e7e3f6fe65c793432a185ecea528fd2a9ed5c4b6593ac11fec797155df192d33de353374ed50c895b87802b1508631e0f3f5ef21b1731118538a316f5423ec8c7e90ed3a62471dcdd0de9ad70f5ffa00dd4eeb8c4b07d699608541753daf3f3661291d690e180062efab6b79eaef6b845623f0a616f02b69ff44adcc4ddf990b98efc331ec0beb81e916b0c4742fa02b566798c2b96e1405a4e575d2d679a7122c1280d230fe9320d8789bc1919c8d237c6945f67000fef0d15ab97175da0ceffc3f7194c8afff977bffc3f7194c8aff977bffc9a63257c26f65dc8a4700000215b404c270596d8642d29db69a634ecbbc27bfcbcfe39c788e6e7a4d472f831b957f28cfc399b596bc1675790e824cead731ffddd0f385398201959587e6a2a110937ce2cdac94553267e03e9aaad3449052136eb7b5cd389171b773af19ff62364d8592f5cda582fb8d0a946c48ea8a801c7e820fbbacbd5e0cf47636ca5d90273977b1f57bc1463e6c61a39bce11be417f72a52d5ee82fcc2f40099f509d80323742f02f41c08330af91810e8cbc79a84a7aa526bde1907fc88fe31a5fb50db68d5338076e38670c6c255406192f8f80f77fb598bb5c459121b9bf9d29a64bc0c711cd906d5f97e48b8582070df9ebf2eff9d0fe98507e923c9afaedb5d1e7167d654a8015add7ec665c504dc7d08918e6ba3cbf84c897b8e3f08a82c56fd15fccc2e41aff82bcee12f895155e3ec36fffe088ed5e4095f04a1d06011b83936a4b8f90afae5b67e0525411fe495311fee9b250e85bafcbef84f2e6b144b371f0237f4036ee320f32a60fb7428c5c5f59e8194dae0eadc19c75d6d0c6b96b4dadaab83b25188c1fb85074a92429efcf2aad81cd4fbc5d3113df52065c429ee6ba8cca8ec83fcc58f0f59dd0f0a6379f22dd144fa9909a53a5bafc85db742212207ca87027d353fb932e9caa5d8da2ffe54262abcbfcf940a39d849e13120d8532075d7102b352671e22715628209ad9db70831d54b1f96eb2b830f20bfa0c8bd146c4f050e20ac1dd981702242c9fbf232ba5ad24162dcc2a086e83d55962fe05669842d7f1d2125a08c44b26ac75e8e7e503b35ed2f267710a9f83bacaff4dfc4486734ce3aeef51206946e1b112436c946ac91a9d6185043c328866fef674ef0a99d1aa704331eff7687158ac6764a878dd0c6b041def0f9a278a7b4738fd0280a7806251ee4f7216ec286770dc2f6f22c6bee6ef03ca8e157f0db407dd7bb57e8441aefbf119d2ae28c619c42803681ec4898d2dbf0ed5251aec01a6a4b814f3f2b0c78034c91e56acdbc50bcfd3872644a2c566b599da750f93a5f9bb4f28d76b2baedc68f0758bfe3acbc440c48f87f0e4b78af26456baa60d162a74c24bbf514a8cb89b7b1050f50b19be84b2b0e5f4a8bc7b09dcf7dd220ac7646b4eed6edf0ff8fe3d270964e2426f09b0e5d1b32c7d14de2c939ddb1e14da504b4fa9254b316bfe43b30e086d195648d2812c90ca41ef3b47e0890e2c27debcfd003ebff2f5e32a1bac92219e69f7a088c02f6da4993ab9ae03091664984c5e68adfe91b1a74471d253ca97a682a3af86748decde2e8c9102736af19d0c6cca4cd5f0b563f59ce162430fceac885253927aed476991e4f2ef7fede7df43c6f9b7f7989bf238d66766f4be57229b892fa9d6c14171274f930c6dee4a10924b602ab1495a0697df6417bdc1173dc6ba54d5be2de4afe081279fb74f45ef81f15270823a2bddd47e3ecd285d6c95a3cfb53093db81119de8a63a39da5db027d9f7dfaeb6bc49dd33ff953b133bbe7c50f0d0021bf63095e1dfe989cfd0457d7d8b67a0cfd442530e83e35eeebf479fe358462649915f59a6ab57d36c072fa911471782fa3cf8c5eab590e07885a6945f1c5a5f0a3b9a2ae97575cbdeb5f8cb39364e599e4941bfc8ab562746b25b966d53d91b2db6962d7806012c8748578a6a0f4d4bf44456e6f7fd052e30b170459fc50fdae97738557e9d6bd398c7ed473ea0a43a4825c62ff7efe556a561e6f171b3416fc3ae074ead8c2c5cad25e225e90884877be197816713bc34c738a7f156ce5cd488b7e604bb77bf50ef93e029d308e5ca613f285ad3df51f722ff4364d36a6f19a8e19eed64a0e657424ec720757b84ed26ccc4a8d4f00f2847a47a85fe0ebff652dff332b9237c5df6dd8e067f47ece5ed761f12e2bf7966419ce41a90675de28b3fe4a557f217ae9bfeca7a5ae45afc604953fbdbc7fff96f7df2a399502071471f263e96572d941c311f5d9feff21cc0644efc4dbb5a38dfa938b2245ac28e1b4cd83d538ed88badd694f918ae732ce3d812ee4cc0e78e7dd92bd5f9457f8906d3051427140cf61ebfefacaaa1c660d4cc3e19926b708b464cc9491d41fa5852b441809bae2e8ef51f9ef7d881f43ec53e63a94ee8f438647f0d13d7388a567fd5d53b10d9f3dc5a77116ac0aa7d2f6874cb9a358c9471044a30a8a9064fb46b153d251b59523c80ca0d1e9e495f1334e526bbbcc5e4c1f1b83afd832d47d54ec6bd52c85d314c68e7d670e9a36b3220165f2f825cbad4071e041172e4419e9d07c0367a3c26418ccad13d783de38755be52b470e23f380a9dcc88610207fb59a0e938a007e4fa3ee6538911cb131ba5381e97a351d11b96ef9e0a267a37983ea1e6341f8a19d5abcbfca3c2db836198e507dde70e2f534427965976f75bc637bbe84df23f7729a2cdf1a9f095d42348067a4e0a9ed4ef710f02f28cf40ab3822833abbe78f7b931b8754d696e2be76eaa40d74a8fe41ed5a7c1f7c3b1fc8bd65918d620152e3089663b1cb2564785d3e2d27467aa0a5a7fd6a51a588436a906c86cf5342f202cb77dc1cbb6c78e47edf35ce0075356ffe2cff6fa3f88b9a32d6eedbcdbb9d2d268e1318a1729f9d88bd2ede9f93be7b84cf7d0c649a25a2131dfb6c05654e8759eb735ddecd8cde7d64cf0bd054c1c7bff18ab217e3c0bd61ea712580e2ec695ffa273c791949063cf051415fffc357f33db9b6a8ec1484295c3ac3f4a305818e3b05e96e86d149ff9896f814c4ac6007aa2792c083bb1ef59478ee4a06c0bdf6ffd1255cb4cc996cbbf5e8ceda0c9ba42e628e889b6c321f3e37d9f707fbaa9a761db921434755669453f3fb8b62f882e795f2af6b4d64286074f55eaf74b9527c762067ff455772c80e2bea2c39670343b88c7def3818206e1427dcc8fc5b5be36ae8d1f36ca4b0d3d634ac1dcffb35ed28a1e2000000033f20c97d0d61754708119733e99280006e00000, NULL),
(836, 'NI9XZK7LIATdk8nTjYQo1LvqjnO2', 'cliente@gmail.com', 'FIREBASE_AUTH', 'cliente novo', 'client', '(98) 95686-8656', NULL, '2026-01-10 08:05:06', 0, 0x52494646a00e00005745425056503820940e0000b03c009d012a800080003e6d309146a42321a12a961e20800d89660db0057d148ff8eec7adf1e37f28fda1adcfe6f80a4ba583ffe5fb2afcfbff3b7d87984fdaaf587ff81fb01ef3bfc07a807f63f388f649f428f2e5f658ff0982bbfd57b51ff0de16f8fef7be7e3927eb07fb1f42ff97fdfbfdc798fdf2fc55d423d93fe7bd277e57f0e7bff365f308f687eb7ff07fb9f9036a83e08f600fe69fd4fd24ff6ffedfc7b7ed7ff03d803f9dff88ff99ea8bff6f974fab3ff2fb83feb9f59df44efdaa71c44d3f9a5aaa40a9e582fc6bdb093bdbfd89223ff1f139f214b721d096060ee4adf9a2a2c1691db8136d38ea469fc9baab6f738bde3fe206da65ac21c1380c3fbf558072ef105cbe3703ce44c22aecaa16b87bbeb5f18834b0d8a9c40dc5b3f8f66dbf981c653ed59b3e835e725dbed584e10c060dae33bfb11b4ba2c7bc5465f72cfd2bcda5e30688edaa9b9682fc728fed0d49a7c0cca5c4d47170679ef4ed00bbf44103ff08989713703911a33922848616332dd2efdbbf5543081351b77769d00db2a446d0182baa87ca11102de7549bb2162ff76f9e487999c5b0a40e4a8f5ba3c60efc0e911d036dd888ed65a0d93fd464a5770514cc4b03aeaa9644c5d3b63e1ecd1be508d33e34601340fe2de767ca234608381ac5132faa4f4c0437a0ff20c3002e6d45a7580000fef2c87aa3846bb5cfc8943a7b875e0bfd58063bb13ae69377de2397f8112a27dda8f07b419903a3ab62f13fd17f6911dab3a777b5afd66c0b2b9de61c2b4db5aab65c1a9065f05511cd1c9ffe539d798296b96e7ac8f69cde1201398e7f04acd575278b5ba56e312f5067144f142a1e9ea4e1bb979cc758bca8bcb3672b1ff54378121a4bf56a73cbe1149ff4fc832c048c376ff699c42e7da1df07eb897dcff75c96c2e8c25dd40c4cc671b50492f73456dc3430a3d1b1c49cb2dc186002202fc3d1cb40b22eaadc172e5bef35f9d4e1ca4aec4ebc1b240ab3577fa7b4e5a30fae90072738973916872e62da5fb28a5737973a8e05d10d34f44a05082f5ce6d5ce6227a466086fc18b8f524d4c91b899041fd49b79066c2e9b41d83b5c11b786089a0ce0c6d5efd54f4267c2dd2afdaef273b14c7aa33cf231d4b5f90410e85b4d2666939e170191304a5958142c4cb3ca5251251059ab6efbd207d270c08168682e9b20c35d85f76c6903a3af744fb5aa98484e8a167ab119420ef8666bba8af15f03c7f06712eaef3f0f21bcd7799ea91767cb520975c19b9cc6bcf332dc97435f18bffd235b7e6257eb165b4d28df3800644064b8c9323987d5134ac63fe7deaecfa0d6f63429a89f18537363ff0f93df687acc37c8c68c63cfd561dc68997c4e18e3cae04c5304f57cf035c30e4c91f654d2a3d5198037c8ad77a73d21a597c420aab1f75ca421d305efd677b5d28ed06a3c066a45f602f574d9ff84637f2b46483a411db2c1609ed2fdfd95bfa23e4dee7631df247e342a387a4eaf4405ff4c21a34cfa3e519237fc00a9a0b8e20f816912901b27f178fd88e365f457f5e1e0052778043e2d7895ad96e8582a832e77d9e624ba3b7d40202b26034a18b33038bdc9129cf11824cd305f33b379da3f24dc81680cb8a7ab5855afcff9c214311d12fd9a76616535d001675aba03b6564454a2c02988f2699074c5fd83ec4fcb65c301a05ae406a10d4763354c7fa3110d375c315a2e5b0e3fab5671fe0e255823e71056c36d8bab33a8c87c74334b8f69e627407df5c77f9d7c3c4afac236cf75f77bbff800fe1b4240bcc06e28db7edb7e8869550db163ab3ecb04fefca0d8eb3c50797a06c9a3cc6a4b68099aaf9f33e198a80dc21f5f4b1ce158054f9f07145dd615300cee3b594cd8b2904b5c243997c630bac357d06e29810fe7b29b8ac9741aab708327ab8cb69538896fee275c07f779ce8c01252c8f00891a4069a1d2c33b00491938740ac1bad299c5236abcf7ccbd66f2ab0e5fe2b4262b2af5a3fd1313414fa92b6eef098a66b95f32381c8e0120b24a92404cef402fd4e486df6973c1576a21a46a2257754a0f71a2ca69c29b1335b2f08515397561d67dde9a7dc277846ab0fbd5a8952b0c00388a614adaa7776e0475cf38a0dd8a163fdbc3d824167ba663ed9d75e57d85cabfa6d0a5861917299fd5ebc7f2d3d8cd1d6a0351205b0579ffe6bd4292ed05ad6576a8b827ecd49a40169869eb0c7b369799a3a95532c33ee6adc3d91bb11e1aa123da263497d4d710006ff43e46a12cbca4c77b93471aa7594ccaec8e7f84bc28816c949ca6fcc09f018aff87e2a2cde0d84490bff837f9fe7ea6d58e84527df016d517559541bbe0d915627c96ed16cfcdec9e021998b4a76e4f44fc3b2c780e9af4e841806a36d2db0391cfb83601895d6f8cefb7e2afed7de7eb15b3fc2017fb77926fdb7f302d163395367496be7e05fdbb59fcc76cd6dadc57455fd908f20bebe52f9e40cddca751b78ba6604f7183884e4b8293cc7477af00d14a90f30769321f846a01bc2e1c3647963e38c0539cd6dc22bb0d33e27260241c444b99684019f9a337c9648b0b83a3f1ff1cc4274db38ade133e9519d6c2680a26e030175a3170d10b0e754142fce7b2454f26a4a7aee6cffc39d331657d4e85422e862095999ebc7f34b53e444dc6c3a4c7d50fd0c1e0e0a6215635c73ecb51b9acff8fc322aa6e0744d6ce80440dc8045a24b45c2e928ad57a1646c44e080524810e52ccc19385535e7e4eaa0c9cc25235869dace297a53575a2901ecf67d6dd45c2f3065cb47ed3a052f59fef07cc04ee9f0ba9377f17749abb67bebd61938c0e249f7aae09919f00beab0f2a44c6049956271721a2ad7660c088406dfc31934bef6a836df5aea3caf20c2e20c0dc517bca0e80181045a4a163499c2e66fb2f72ca3bc779cdc8f1dd762eef9797402e6b175b6c50a3f8018704be06e8b9d4d9473f74934d43bd4147b69bab917f53c4c7e4f56d8e76e4976712438367025d23f036117fc5bb2fd4b75be138fcf3e149070c4a468b1f1a2f32fb42357684997846fe03097fde607332b5a6231377434a18f33ee9f175f3051d57229b1a71c41e48ded486a60c49df00cf5d3fd4c471d36a4af164dfc263316e9a3b2e02164c26c38f87b8b4a6bdb52fa574a014d7703dffaad61507cdd3579f0ab6728881dfed4c4706da6f51fdf9d70a37dd83e6b465bc70cfb0b6a3a8a5382872f1078de2b94948dd64a8955da70e3770d1db9001e53f26eaf5114d31e8e44f0751dcb40f7258438ff7121c17702631131e1861f0db7fe2018936e6fb5fc97e68c5b2e3b72564703c814b01c7caf42f5b8ce9e7d16f7fca70179f67b8ee2f2ef33ba70a232bc2e4675d9fc9299f699ae05c3f2f1e05bcad8fdeb61b389c56bdbaecfcec0edd6eb7a51c0df5c2f1283b6db86274fb88dc8fa52ed83149fe2b2cc200449e197c0a2b5060fea4907056b62213747286fc2140e431f07a27e3099fa263d5f0ac11dca5bec4d25f4f53d65a4e99e2c16a4771cf07c6e47549fc49e44f995b1c451fe09b2cdff5bb08f77bafbed0c86b332096df0a54507647f36f3544c1dd101cf19af66e8faba9d917a64634af05f4f8cab831934a109ea169b515ca944497cb551546f3ebe71dff448216822cb900c073c569ab078bf280a35daba945ce6a6946b22993e8dce322b26d7941aed2b45ebd8b58900031b741aaba0a9af13dbf80788489aea13a264f4546035d8d494e8cc968298421b7d75848c603d940869c321cfdf2515cefe68fad828414399e5f700d5368a87827c42755f00abce98ff96890480d9f1df1a0ed57c7f91c5fd2701e88b04de80e7521d2e56ecb108826cc904932a0d3eec934a79bf6c0391c1572bf0a6372539f5a5278801b3d2ac3d8c0d404c287196f80819d088cb3a5a54577d83fb0ce891ba17b2deeb863d93f82f80354e165265a5166d44ee8a9823a7c2ece52a07d6c452ff12ee7fd647f2db90531886ac41d537fb2574cc158b7b0c811f32b4c0487d2707ab2100d51cb2a013a0e789c066e88b3736d8b29712854ff97468a35cb66dba35eff3623727acff9713ab3858e8cb765a4f4b2df04d31e61f412ff88e986dcd3646f72e680be50f0217a233d78afccbd9b0a6f0200cfbd2914d8cb6cf643ad335900708b519247496993bce901a684c9ba4e4476ee1dd84d723423f83122e41a4bc90b312b8b41850f1a1bca19edf8670c4048f8bf6b42d168b6c1337fe2e387a927594ebbf6637ffc8648937360ed1a34b100c4a825a69b69b355b3aeb8c654e5e4e7c11c8d6419d3fb5e792884f49d81a5d6271135ba974b763be9a53ea459950763ea4b2fec54a6562a4150a0fbf098301c02d49186a96301564a3a94cc88a09bf8ff3ff0a6df4fa8dbf4f0b11c26691abe35ca287ff70ba027c46d050a3ef0c1f2eb51c36800ea0d540cf480bf27ea0d66ecbcb647fe6c89958d181196f0a794745cbd23a9daad1d059c2b8d8eff31a4e676458b3df040aa7cf95a950a42438c75d52993bf7b7f474b96fff661e533c515de0eadb14d7b4e0135fdad714ee6be267c392d85062c84085f42c4ae205d3f5fdc9a36cdc5346a01a840b4fb15454e29e111ddb1a5f983590a31cb1483c4e48d608d12bccfd9f1dd63ea79d8c25a224d7b4f02600c530ce24a067188143e85270aa5f4c541701bc064d14213da5f41cc6e6a3e692f7bf4fef380e768014e17e36783b86f54c778db918fea9249ee7983c5bfad0365daaed694c24c7edcdb497cd5ad5469474ffa909a83011f2c6a74e3e3b4ffd2ec20c65e9245e904413f3b16f90a79b3df8d89ef85bd642f92bf4dfd52e9cd8c8129059b9c20d71ced79bca027c3ddabab73c54e042d045389ff6757d9dcf82f9d4b47c1e68aaf6a001d46ceae00d55bdc89b3647dae9f295bfcca36218911588f9c06168460bb4efda11e9a40749b3fb6bfe17a8608a723562615abb479261b8070d2f65a308e19181675c11c422c3d73f818d9b091ec6ab39e5af648627c8bb78318b4094718e4a0ffc309d3dd48fccd70c57267edb61f6776efaff44185e7e0992c3f17af6575942ab6165207bff41500008e776d24e794b447403037a904bb787244c0bdc55667a5f6f82db6ea1f3f305bc5aa30b03d1e7b95021228c0922bd1f98de59fb152f1e0a01caa28915c8d1e9cb33616cc57869941b9c39b68f8f859fa4fcb0274ce7dad98d9b3d28482bf4d108366b9f3bcb4000000, NULL),
(837, 'mock_client_test_1768037335947@example.com', 'client_test_1768037335947@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 09:28:55', 0, NULL, NULL),
(838, 'mock_client_test_1768037717637@example.com', 'client_test_1768037717637@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 09:35:17', 0, NULL, NULL),
(839, 'mock_client_test_1768037752232@example.com', 'client_test_1768037752232@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 09:35:51', 0, NULL, NULL),
(840, 'mock_client_test_1768037787838@example.com', 'client_test_1768037787838@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 09:36:27', 0, NULL, NULL),
(841, 'mock_client_test_1768037928517@example.com', 'client_test_1768037928517@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 09:38:48', 0, NULL, NULL),
(842, 'mock_client_test_1768040024903@example.com', 'client_test_1768040024903@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 10:13:44', 0, NULL, NULL),
(843, 'mock_client_test_1768040103551@example.com', 'client_test_1768040103551@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 10:15:03', 0, NULL, NULL),
(844, 'mock_client_test_1768040451407@example.com', 'client_test_1768040451407@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 10:20:50', 0, NULL, NULL),
(845, 'mock_client_test_1768040754573@example.com', 'client_test_1768040754573@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 10:25:54', 0, NULL, NULL),
(846, 'mock_client_test_1768041340228@example.com', 'client_test_1768041340228@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 10:35:39', 0, NULL, NULL),
(847, 'mock_client_test_1768043658287@example.com', 'client_test_1768043658287@example.com', 'FIREBASE_AUTH', 'Cliente Teste Local', 'client', '11999999999', NULL, '2026-01-10 11:14:21', 0, NULL, NULL),
(848, 'test_firebase_uid_123', 'client@test.com', 'mock_hash', 'Cliente de Teste', 'client', '11999999999', NULL, '2026-01-10 14:19:41', 0, NULL, NULL),
(849, 'VrCDPYvjZSXpdyF4aUlwbX2V7Fa2', 'lucas@gmail.com', 'FIREBASE_AUTH', 'Lucas', 'provider', '(87) 58456-4656', NULL, '2026-01-11 13:17:45', 0, NULL, NULL),
(850, 'wRVHm83aq4cK5q4CoUm4IOEuR5l1', 'djfjsj@gmail.com', 'FIREBASE_AUTH', 'jdjsjdje fifkfkfk', 'provider', '(95) 64656-4646', NULL, '2026-01-11 13:21:23', 0, NULL, NULL),
(851, 'mock_client_1768173873949@test.com', 'client_1768173873949@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-11 23:24:34', 0, NULL, NULL),
(852, 'mock_provider_1768173873949@test.com', 'provider_1768173873949@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-11 23:24:34', 0, NULL, NULL),
(853, 'mock_client_1768174113012@test.com', 'client_1768174113012@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-11 23:28:33', 0, NULL, NULL),
(854, 'mock_provider_1768174113012@test.com', 'provider_1768174113012@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-11 23:28:33', 0, NULL, NULL),
(855, 'mock_client_1768174513946@test.com', 'client_1768174513946@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-11 23:35:14', 0, NULL, NULL),
(856, 'mock_provider_1768174513946@test.com', 'provider_1768174513946@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-11 23:35:14', 0, NULL, NULL),
(857, 'mock_client_1768174554985@test.com', 'client_1768174554985@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-11 23:35:55', 0, NULL, NULL),
(858, 'mock_provider_1768174554985@test.com', 'provider_1768174554985@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-11 23:35:55', 0, NULL, NULL),
(859, 'mock_client_1768174718309@test.com', 'client_1768174718309@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-11 23:38:38', 0, NULL, NULL),
(860, 'mock_provider_1768174718309@test.com', 'provider_1768174718309@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-11 23:38:38', 0, NULL, NULL),
(861, 'mock_client_1768177247831@test.com', 'client_1768177247831@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:20:48', 0, NULL, NULL),
(862, 'mock_provider_1768177247831@test.com', 'provider_1768177247831@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:20:48', 0, NULL, NULL),
(863, 'mock_client_1768177380871@test.com', 'client_1768177380871@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:23:01', 0, NULL, NULL),
(864, 'mock_provider_1768177380871@test.com', 'provider_1768177380871@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:23:01', 0, NULL, NULL),
(865, 'mock_client_1768177428046@test.com', 'client_1768177428046@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:23:48', 0, NULL, NULL),
(866, 'mock_provider_1768177428046@test.com', 'provider_1768177428046@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:23:48', 0, NULL, NULL),
(867, 'mock_client_1768177469937@test.com', 'client_1768177469937@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:24:30', 0, NULL, NULL),
(868, 'mock_provider_1768177469937@test.com', 'provider_1768177469937@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:24:30', 0, NULL, NULL),
(869, 'mock_client_1768177512041@test.com', 'client_1768177512041@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:25:12', 0, NULL, NULL),
(870, 'mock_provider_1768177512041@test.com', 'provider_1768177512041@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:25:12', 0, NULL, NULL),
(871, 'mock_client_1768177578660@test.com', 'client_1768177578660@test.com', 'FIREBASE_AUTH', 'Client Test', 'client', '11999999999', NULL, '2026-01-12 00:26:18', 0, NULL, NULL),
(872, 'mock_provider_1768177578660@test.com', 'provider_1768177578660@test.com', 'FIREBASE_AUTH', 'Provider Test', 'provider', '11988888888', NULL, '2026-01-12 00:26:18', 0, NULL, NULL),
(873, 'cfUXKwQYccc39TR8yb5SIkgQmr13', 'stany@gmai.com', 'FIREBASE_AUTH', 'eududud', 'provider', '(46) 44545-4545', NULL, '2026-01-12 01:53:51', 0, NULL, NULL),
(874, 'O0wy9N7oQ5gzX0NMPMA4DqsN4td2', 'lidianosantos1234@gmail.com', 'FIREBASE_AUTH', 'Lidiano Santos Barbosa', 'provider', '(99) 98482-9608', NULL, '2026-01-13 17:57:39', 0, 0x524946462c0c00005745425056503820200c0000b036009d012a800080003e692c9145a422a197c98f60400684b18061d22f26f2fb441cbaa594071abf71e13f9600d7b50fb8491566630117dbb8cd3b35ab7d0ba26745cfdb285df101c1a2a94ea184e825dd67117f4afc0e2b1cf37eca421e0fc91c4ce0f08f3b9edd7f2f4d4111122b8f03131362b1f84fc1c6b82b81d638f6e0d6d64fcd5d24c4b22bd9495ab6e4bc96516b475d6561b62b0d364eef05d87ee1aaac0c4414230d1ab184b53b34c789324fd223b6c8aadd4efbfea1127c746ac02287e971e89cfe5fc98b88fbddd56cec7ab009dca4b351696955332be4f00d0f9bf1b0a3013b22913147764e435dc110c2fa71ba4ac9800692c40107b2c7a94a75831e6374ad4aea31f969c5125b0cd7d27d27bfa6bb118cb599e79e8c0aa66fc07dfd01c3a6f803878ffc4cda8e682e42be20ff5eee9795d698352297a8f2f4420cfaf300a81acb8a31e0768696a89ec8cd25a5dc3ca810f57c66c1b3593c6b06217d0a4e3e36615ef9a9ef2bc9088dd2da3c6ddd6def513113b2cf4d71b8dbcae0dffbb37c50e3d5b7df809dc4bd6dfabee390b090aeb6ce0fb43ce5bab3ac9a145c6ebb5d75098878344c4a3f7ffbb7bab3ef5ad3fc99df4977835000febd9f8da4d4a495403d0fb94db4115b3598ec73f110728f537bc3c1bc68d8a74a1cde4554e891e4b2b7dd93f76be4e42b0aabec3411d78cc25bf30278ca4a52f7492ee7db4c831a822a247b4eaf8f88051d96d8ed54c82dc60ee6212ee7aeac7e17f50d6e258aba6858ae8e1bb93b1e23ff055f6aa50f397908dfb63cfa6eaf0b517580755423dd6d8d72c8341f3d460448f7fad2be3f5f305973cb26b18b08f661ea18ec622e21b98e0730d3e8176c07d768f15995daa2c4de3ee8368759812e33a5cd188e746aba3dacb36bf71ae2d20aed9c8bc1feebaac2500adc010b99738fcdac6300bf917f7a199f57761eca3a510c5f6a772d69035320f42af61a855c661dae64214300e526e7dc826efc54d6e0cf08cd7995d6316c5209b443d18e7080b3e5523c637b5446aa8a556bcb0a8f43d33f704f3276d3d8f51fc49ff15d7d170f47be79c6fe07097fcd06b9d3a29e02022dab9a3b9cd7c27f3174db0e8d673f58f1143bfce49f53c02125f47b235d61a900b707add685fd236e9f0fb09aa6025b5f6302a492685f56ce26b6c1cdc6827642ec8388ee24b5a2a96608ad8f0ce781f13e180b10f6fd2ede620d27c8bc41e24a29779cf7f86678c6a4a7eeeaa85c8e68c7274c7bb1d4fd444c4ff8b70f9f3678f679389a8ef2c72410a3eef8cfaa461120b5f8c1fddac7049485a8029731421f14a18b459e3498b6eb7d1797cbd2ac37067a3e241d6dedd56c276fbeb9f76113452097ad6454e2a1dd9cd492303cae3c9db7bb18c3f375fc2b64af7249d9e020c5e3f6e6ac1827241f15fc69ab3a7683e8e226a9dcde3de9537460025eac1e78a91c08e852f91cd40cead970e726b39e878d3911584ed087950893397f8eaea12d4e20a07bd26fbfd786d175b1e4837fef266a89daca77fbbf17dc9af154c84e77bab63dfa59b2e2a3b14fad6f0aa3bb537ec5c114b99b7c8dc917c91cd8ae8792541f7a5e19d3e0c2c44f7adc2a95a52101696fe6dfb4a1889e96eb47e7ac3c027f7551d54bb5b68c7951b2305d737c155f70c5a678ddb8784b4597c3fb393f76765adc4e19418f3d92efcb5a05aa6186c1dbbbb2730b2b5b3435c99771895aae2c28316e5be3e841cbdf0eadbd7e8a91670db6a296ca926565138153e47aa456f8ef7ed6af0cc076fbe15cc6c848d8422e9f589a726725d416473f9da199fc34c6afc7feecd4f156eed7db4b77c133c9f7d53b7704b46e1baa1f25d6bc743a3508adc9cb57b8364840454ce82e31e926fa3de47bac573240bb0a1322cc5dc17660e3979b7b77c2e4865266d337bbb7036b57e7d563fb4506ace84fed85cd784ce5467aa7ee6710c4949a57a4514533f7bf826e9d8198666535926dcde613c71cb7b8f8e93b7d1c6eff95d29cf2983f006a41f53e439a93d2d2c86f2126b8b16770907cfa52103fdbc0892a03a7a542f2e1d2aa45abd512d37bd84e256771efb909029c327cafc2f355ada0c19050de4ccbe559f9fb89733c99bdf858a6875c1d7050f3ae1a415ef6ebf252d66c9c0b886412cf5b52e3aa6b3a7b83783b6ad80ea610befc17ff56e7e1007413863935e3adc5f0c57073bb3862de82ec03bdc3328dbfc2cd98c71118bce08d6f11cfa1403db84c54659a31f9a293149e274e6ef310376bf48744fa149bde7fb11694af22c1d0a0b9f38f4ed3d0186ce7ab840813e6fe44d1a66b36932853b7a3f194a51a913094cc5c174d6be0734dbbd7f2190fd027dc2cb1e73e50615f9d64fb3cc32c6adc574af186f3711e04416ac5c0ca0d4b6d96a8c00c293bd90d53a150bd8bc97e83f4555005071765a820deb86af4b8e0dadb1884578f9e6cfa9ac336be18311000b85b293459d5f08840c8348d6be9610931df3c5c8d186774b5233685a11c92e55c53cc1570e7d72124d1c6fe2cddf528977e3fdc4ebdca9a03fb172f3b0d8654b6e6ceb82a4ebf4353dea47aec74c108141c64b2952319505b9bf61bff39a8521f5f4b5e365800c02b95850d23e5445cd6accadcf43035f00baee8e6a3766f21c638f4daccee7dad99bf3cf729231411f43f96d50792ac2d2f60998888ebbd9344fd89bd6fef7e263b4afa53716274e8589e0e7c8f56a09b74451ec5a4c00506175c22fc1f7db84b8d37c816b29d3c3918867f682a1d50d6a580bd5cb252afb8f53d662f05a5610ad36a7cbf6276c59a28615d6dbfac53c3e534af31bad9d0bfe509409aa5ab13b60002ed1a82f6a8eb0a6b82fb6b1b42bb631d29a7ff063200797fb1a85f628857ba19e26892a07e027a88f31eea4c3e3f1ec5a0065632dfef252a8ef72a951fbbca8642d86ecd18912fb3f4278dabb929422f30f111c4eeb72d0011907441c370812ab9801e1fa2cb4d9bc76caf5a4901142a52f249d13f0e34cd6df49251f770378ee8b30038cec3b5abc742d1e6a8d97d8652c4ef4319f7352781fdb5331136f0b9f9307b5918d1ff479e94802a07acce164a1aebd83e03a834e18625ecfcd18723e71238b8b9c81e0623a64fea319b5cc3e98516a1497dee27562be9288cb89fad1ccd3d38adb43ba2f7d9b4061890645aa8078cf124de7369fb1b4c6d911de9ef24b40a295bcd17dc37fb619d7bd0fc536e958f672fbc18566c243b210baa7055aa4a55d7a9a15dba9b8481092665ecc7c99007bea3af5903ba36c35c1449590cf764f032109712dec79bea114f0673398a95bddf56df790b82222bf8b3c24202f1418c37beb1c6d34363e615b9600a37ca3e99ecebe873ad079f0979f61d488d4edf44c5a32507c538e2819fc70a50d2e8a8eafa7745d59d02ed9ece29600c806bc1da0f874a4cbeba8a0e04f39f4d0769e1da5d254c52b47213636523c8f65a65db97dd144079703ccaa41761252e4547de2ca4790d5287399a9ca33c9093a9fa3d50e743dcdf90be045ce148c5a3e12229bee7533127b71fa8e5f071bb82d0598c684826bdc3fab00cd74438751908faf8ad87f5349c92033d123c7028de5f16daf8c8a6e3632ba2411789d6b2d9f791f548092c3eebd81452c55d1d98988063e9de7154e60f9e231e030df695a5404b86fdf5917dee1f33ef8df8d5c1c572e7896b5531ff59def74847cbc5e6720d1bfb94dc82a7f4ed8ded0e090bcbd984a2f63a27b6d7c909f864c3a6e6b9981121cb364ad19b0419f12be308fce9505b24eaadc5c6fd2abad51482ddd97c849cb193c889ab513b4b25520a5a4851e2e30665880c80d7eeb9e039fcb19ad8ad3e145faeb1ae7e3ec970783e6a0397d10fe19cf0546bf546035d6eb714ba55a1c8908da7392910cdf4ff91d476dc90d4616f0c5440a9121456e48e71d85265c501b9f305ac018db98601f8863c3b16e05c35a70ee631a50240c041929b55b63d148dceaca7e3f2c5b298382ef24e58d41aac0378443b3a825cb1bfb29b62df23cc1cfe8456196a2055ee2b07f5ba5be24f19d5e0eb950152b9661add46e899e8365fa47d96057e0143707576fbdfab3772c8ca371432fb169d22ef4706076681f72b72f165123cf160a54001e099e0fb7949f4798d26fd4d52c25b546de83ce4c2ccaedeb076c100a0ae92af1ab160781eee0c320569d7a2fc9c22f6cb3fbe898ae762ba0893d90bfb06d21e7c1da53e424fd4a768cb627f65e547784e8c2724fdae31f36bc4a2936ba14fa0cec0b5bd18bdb433e4da4cd79fa762cb6babbf1b5c86e417caff9abd9f7133e5f86bbee40e683b797ac95b984702f778b249790000, NULL),
(875, 'dJhx9AORhXNTgBHqtJubVOh7mTQ2', 'pregadorcicerosafira@gmail.com', 'FIREBASE_AUTH', 'Cícero santos Barbosa', 'client', '(62) 99955-9186', NULL, '2026-01-13 19:25:23', 0, 0x524946466e0d00005745425056503820620d0000d032009d012a800080003e6d309346242321a1ab15dc60800d89401955986a6695c72dd26a74e7d0f4dbb7739daba303aa6fd003a612d2178bdf8bf067c717c03412c77da3fd8dfdafae3fe7bbfbf90ba813bbf94fe817deff027ff3fd0dfb37ff27d56ff59f48bfe778887deffeafb027f3efee9e8c7a10fafbd83ba60a1e05dc8677908de4b279159604498fde551715f163bae905b4182ea7b15a4de77f33bdea432415a8d750947c7e0cb13d06a35d098e9aa1e54ffe77fb1a6384d7e14df61efeb19cc6de072558fc050936ee8d2b321b8307bb26b6d85487d329fa582197786e2414b1e4ef2e52bcd9b129d5ffd50e0e488c57d923bee3d37f5d8ebf1b8adfd6d7599cbd31c0c3c5ac2fae7f0c7e0ce5ef55b14c1e4ed80bc61f4d6c9e256e71c71b8c0aaa8703b2b3a0f8df9b6600bfc9d71758cf339dfb85efb16784b1a1f20d63c457ccc628645420fb3ea6613601de30d5f2496e1e27a277db79342db9b608b52af95e60fd64aa418ea31249c37917736ed61f43ff68d7fa67d35e1ac53c96059fcde06d182eefdf704846a352924ffd15f8070351711711240000fef930d5fe64e93ecc7f9f17cb80044d515af2fdb7b083efb9c8c6ec319cfa914120662a06c9fb7662e1e08dadf7272e6f9321d7ee3907e09e61aec0e6de1dfa746002adfc58abf1d08a4ae04161123c4a7886a6869a53af8c9c30f80b798146bf30064c4eb59304e9ca4f7f768837cf7da62adf460036662dc79e1f497051e544876a258c2748c14e5bdcd61751d6ba86632d4c6cd4e1252ca9a95bc36e12c7bbfd122064539d6bc1db3c4e597e50124018675a5db2ffc702109701997584ea3865b2b3b5685ec8d12295899c38a98b48963450c7704667369dc6b865ee527721a914505b3f2debe97f906e36d4543cbb6928f42b31d67618aabfd7afb0db5a0fd6d6724ad56a39223aa342206ef73cba19a652f3591865ac2f62caa803554040c13b1077711278a34dd7679f9cb7e0bd3ba8f237b1c9d609ed14bc095f5e27b4b2d6b4750841473124e97eed22c3f0fe3700c9af20922e6cc623bb1012bafaebed610fcbfff8409422a18cbc2e10807c0896c72749b2fcadebc69e86bc9499dc5d52eb2c1b37745a46288b6fd66508e2b77783709bec8f6301b837450726d3121018d8a9d294ec467c30c3e917a41f728df8a87a088bf5735d7601e04be8e08dd844b3e174694796454ecadf54d3d4bfaf7c01b57a2400949ab727ffb7fad97e917df25a566a83d91196ac7f84b2e8bf1a4f19113b7076d71d73fee352bef471ffc980123de1ad23ed852c05f968576ea57a00b129dd82c6530f3d4f8cadc336f1c96e77c9f34746484170281942ef04b9f2da39dfdf9ea605ae9be6a601382e4c18a0237e6f22199b33a0075fd6b940e16f35b3e8856b9554c4222dd8943e06529eb853b1bd47dc657cf09a714f890f666365f5a131a88da5b86b6838d161f77f8201037b1f7233cd87ea441c12a00083394478b536166cce9546aa94044a50b9eeff6f950700630261d52f64bec6a4b0c411c4b0486a6b72d9bccfb8624b9feb48cc8384d40df11368522134a9b7ae070c9c36730448c3065015c96664cdda8dbcaa182a2eecda6401a558f37bd5285e199dfc15beb2c4ab5dfe3753840e0786ee2eb75b28ad7971674db8afd1bf363f3b43dd74b314f826f9f4f3b45fce8357069400888a43b60293032a11d214721111c391264abcebe728ad33b69724486ac91597c5d0ebee24878a41b0637af154e876416f03c5014e8acf79feedf18555b9a80bc625cf9d535471878726a967fb3608d6dd18344bfc94a6c81beba9674e2769edb6658e0130b25507de4758448a909bfa217fddd21c4a68c0a9bebfcc4c8cad7c77c68044a8e4a8ae8256aa99c3c0d6bd454b7ca307c40e76158eabe69572bcb7467c266ddc91d6abff0abe00b9107844af982317ac40b4ff9156a9d7e959569979fa85f5933f519df3979d78f2fa708110eff03a0f4bb565b29edeccbb28e8c277bd19797f51a9c11bb32235343a8a789dd719b4f1be677f3e372bec5e496f73e728b1c993b137866e60c5ab9c32dd8cb529ad067f8cf0dc78931ba3f01e56991a06820f2a607d3134e94c78334ddadd68f1fbbf637a10adc3e4b989911bdd2f4e12dbfa5b1f83720fed5b23718281a4edb8cf2fcf8e7401b560b2f2031abba6ea5b8f9bb62dc8e48e1dfd3bd6ae0216df26feb6c5f0c2f5efeabf3d378671984348fd0db9389faa8167902e4b47ae0f6fe58a0f4e3c2d84aa0faa9b971515c67a7f3c1b4d9d32e0736b33a7bc10702305b9d33271936b98179dbd1747b3ddfe22a365569490e403c66e6acd6e17af81e84e151baf7aebe1721f26fb24912c61d8a5d0cbea53351a081f253a554af3afeb2abc5062ae9a55c310ed1593105d5954c5e64f7dc9e23b93d5c9699f98ac0026c533690192c4a737ade3c3e78c850b37fb97a6ed0f9173704f63420c67b2c54bc68896c63280077421096b2403a27da862f5dbd9ae0759c7d4613b4c3afe34856eec379c55ad5ce398678240306e1c61751bfb4dfd16ce2957b4ce31b6ab9b55a1aec3ce6303068b19b50178317c78aa0b57e548080a29fce005159591a48fe57ab6c66bc085021eb21c9cd639e1e72416e66b17a3354f1048057847c1291182ee2ea19664809da5c09b2a2d7c60fe8d434f599f4877beb9b5286ee1cb0650e36401a13e961588aa4cd7891967f0a3432bc8e2ba8b112b1b03b49747fd6c912685e5aaf40fbbb023784edc2d00cce56a7dddc67007f10ad29f47e4767d437db8173b80e479c0d74b833897f40a6bf721084ef9afa2fc3677968655f7ed37bd90f4f37e7d93ec6edfb180dabeeda43273753fe8dfdf9c573e6dfc43bd622cb2d7bc061adf06b082fcd382969f9b3ac653ee1155b8ad6ce39fa49cd3e6c169597980b07506edff9938cbd890459bea9d341e88627579a96d43ee1dd82b7165cc154b74741b118e71cf530aff9176b448ffcfb086253b0935ead9c5d01071fdb0cac67253069da032de73c33b166da65276f4759377826e5a7b525184095f3928ae827962ce2af771fd1cd05404ab37e33cb862151321e6accb154c266c703f1d957ffcd7a1d7b5c686de3fe41ff7e98101b40c9f007d1af5e6e212684b9079171d6e7dbaf0ed5d5e83c3eb20c8cf3dee27a2756c7272f576434fe699b3c94386ba282e1246ba1ea9f4763692bfb458341ac5b66cced75dda4b1e9cb770b08c6fc6caa7fcb88c361273159ea5bc9e5ed0738b8bd2193f5c2565a5c9fef7b9a2ca12fdab32b695468b4192f475558e7ddebcdaecd92e137493472fa11e91befee23e4aad68de836aa2181fef568d661193de482fc94c45f7c53e9b511fe2e1522f12149aea8f648cbb2824a3cd764952157ef1c28f0060f5aa5cf22ff3845ca93d5d6ca57ccf0364a86b41b1cb4156080113c7dffb08fbeae9360046dcf0bea9cfab1c25c639e625702e07fbaac4f669db21ab60a2e9b75579eb3fb0784918686caa537b73cfcd0bca6a383681e4ea6e03823a755868ca1d5545a4e14b3e9832ffc661f9e36bc3cf0bb8af42901150d3d80d4351ea3455fb5a6bf515781974690c60a92f5ea38bf44eae5420c53471f69cd76e993c82b2ae1f5740bfaae554e49efd0b79d7d4632d13858f490372c4db983d0f63882dc154fcfbcaea0104d9ae41540f40c26e4fee6732adc96d27cc35299056d4071f1ac60a080fd41f2200002c0147dfa5d75bc08c253c40f489df5b7d71a060ff6962fff73340fa5345db8cb27ce0d12bc479d8394dddc23b5a3d25c4a24847dcc5846639661d2746affa6d0eb19a9600bf1745bcd7046720f1a877ccba1cccd332564943629d7b2fa47c4ce0a3c58f310c4d3ef089b62bee2772f28d0fa32e2a52a52909a0c5857ca4cf9f543f3af72b6105ad92a58335d1a5ceaa4574a2ccd5c60bf117ff671b53995d582e889687f18a5f0865081aff24f7920d7a0dcbb1fe14d4ccce9cc13a505df21ad470aa1760e9f2afccd97916c46f20c19c7412f55c1eecaea481cf99210cc017053e1c05341f1509612af5d84c66744e2e105de6bb349bb24a3d7c9df5921c9b387a1c7ccf8bc4970346127735125f3364f6c1853d7a0e354d5cd47bf3fb9a6f15078384d512dfdf94f3d2313c5e6a091777d3454f0666825f715198bbb097ca380ce3d66426210d90320ecfaf56c228da7af03df151cfe8b37426fdee5f423fc90fdba5f295f687969f8dae7e220ca16ccbc33b61437fa01d7c221319af092f9e1c4c8a6f119c9ad1bf5e32019cc699eba52ecde5e211cd285b0916bb9991a5cfa50c6c7989662d60e552e4c752b5d5554b044a0a241598cdf4fb88ef3826c0d8edc67d5b25ead3deabd42bf0ba9081a6813c891483671303b2b2cfd7e8562d814c3d7ed111390ffbabcc2b355cef6dd8702b55ec9a602370cf692f2bc7276dc6eb19e5dc57a0ef1f0bbefe4918d7007e4b5e5ddd6f9fa1d0a69919524a0d7c53af9591934c293de37941fe4de0b110247615c35d41227d7b64dfe297e002b14b6461b3dcb9f8f5e696664fd776a07608f4b65d4ac86731c65f2d65982754830f55aeddfeda94eb3ce4d3276dc5461804f16907b6fb1b0633e9f2ff7d0574ee495d8131fe9f3d98ac26f4e1ca366927c24946f90d63efd47f9f5430e584c9aeccddead8389c26a46d2abc023329890eebe172afcc733a6a661b14c4e67bd5c60a690f76bd2000e0920b5c47d4b4c1b635a1f117796a80c0bae0b7b0154efa212ae5cc96e69590b20c2e51000000, NULL),
(876, 'b2nVj263cSR8sbcEMOmuNreEWvL2', 'lyaluana31@gmail.com', 'FIREBASE_AUTH', 'Luana Silva Pereira', 'client', '(99) 98509-8129', NULL, '2026-01-13 20:19:37', 0, NULL, NULL);
INSERT INTO `users` (`id`, `firebase_uid`, `email`, `password_hash`, `full_name`, `role`, `phone`, `avatar_url`, `created_at`, `is_verified`, `avatar_blob`, `avatar_mime`) VALUES
(877, 'SvQvV9gNsiP8JX1G6ohRzWHr3SV2', 'ismaelsilva12licilene@gmail.com', 'FIREBASE_AUTH', 'luana Silva Pereira', 'provider', '(99) 98509-8129', NULL, '2026-01-14 00:13:54', 0, 0x52494646e60b00005745425056503820da0b0000d035009d012a800080003e6d3093472422a1a127149cc8800d894016f5fe4ac19615f1bf4c88a1f1b846ef337a4b15c64bba5be14f9bb0e7b4decb5db9cd27863c7ef8979e2fbff91f15e758ae7d2bd72bcc129621ad25c46275a32768d8c1fffc9415c01ff7e9e95ee9b6e8e064e447ce482bb1c7c6cc5f3a95af20804731b74fcfaef63a1b77db5f616e593936f119a737ede76989b69693017f6e3b783adddb80598748a7a887968361b057253e76dc2aca5dd6bee4b3a4e701a8642a18e77a969e745ce1928aed3d7e3c3fca9a6dff41b401b25b0b65d239fe43ed8a873db9ca085d01f0418b27692237c5ea95bcec33d0222a1c92455ed52d2146bf0a6f74e4cf89c9cd29b9003eeaa25b85945569567f0f6eca5c8d574ae59dc4c35cc94c6283336e4d0f41f9bb12ec2a0b65d11e5c6de4c56e939f26e6bc94f3e413ab3106c44e6b5c0d6d79a065c30b3d11cc0d78c571d88088301fffde974ae197d6753e3967bff1b08b30ecb3fdba77dbf629ecae0f435a03f3cb64105b986dc86abd9d98c0bdc9ebb6a0a2e95a22f1d3c66116be68693c43a7fecffba8bebb70c870ba12a0c45dba548a7544022fc8f29c5da64c2c33754000db7f09cad0a5dd699921a6b1b896f5b71f06868e81e29167084950c038c0e21cbd4b790168b93c536498e9dbb88d53a7b9a6b6fc3d4a631ff477192c1f83a5b71a2e5083f61aeffa174d7cb384e276d3b2e3ce01e90f955ed3348f5f525192ab348a1c9fee334f9d90ad947a2b7239c4a14388abd825df09e41a507a7b96f45db68b83dfb99d7425f9ab62ee19b770b0e9195af6f6285af05f096021e16f01b92fa3b409d9bf60e8c9fcfd93e6d421f7b14aceaa25c4ee6329e7142a92b43f17e82dfc155bd40ea99ace6709a540670a38e169f06be6c7b8a966c434a0c01cb6676eea5000cada44cc5e25bc69f4b5d81dc14e03e16add763bc3411abaa6e2b8847b4ee03b55ed668837d55c94560a5a0fac942896ad95a2f0eaebd7a9c1700ae0b9aadab6ff45fa760cd74f230ce9c9d4d8f483a15a6b9ff141e0d11d86743072618a34c5c91255afd9fa1effd0ee9200b98993c59f3263ac3ef906838268da52d7cf5be3eeae74beeae39953a8ea05b4e89abf30e9ba0d3354f869d0c1cb7334da4b432f0ca442ed27d08a857127041cdd1d598a2e2590abeb0117a6ba613729cfda0b9cfbdf53c0507209c1784015bf400aeaa7afc7766f17a0ae2b3d1e8fd504cb163162f2b4fcf6b88c553ad167cb9867da2795a91a55d30dcf0c8b86ffa649bb0d057578c2e9efa6fc951e57d0ca755f5d811cff26c2520ad1babf746e893a51836620f31e27a3fa5918120edfc0051fa0eb5baec8ca0853e93a7650b69e99c544b00aaca8ba8b70610c89a696c5523b07c543eacb6c43c87aca5dbb2284a3452acef59424431614ebeac9381b7917dd897b3f4d34aabfa00df87e88f84bacb32d05aa7df61401c49ec6c817632e9de6490142b89c3b8c7947e0e926d0c9092e7ace55f60934d27292c1cd1e5f34c212fc8ab74d43220d32fda3c5f35e4adf7800bd31fe4209a10d2fa66849991935042d24acf36a1752aa7085aa9b20f19213d5a09d050b499071b4b49862e246cda77707ccf3a2be85413f96e4f7355dbee6369db3202c9044a4da4df8592f8061778df04fce97bafadcfe50cbfe641360a9f6e5d2f420fc8a6a4e5e2c3e714398212884778abfa808c8c697517649626f06479c279341f0143e066ab4f9570f7e6b79a4912335cabfd3686973d69e9e113b0c622179aa7f8744133dd660ea00ea1d6293687ab3cf86fa4af36f17c8d29df894609b490010525824e434392dfe77a39df9faec6bcb40232d81203f3143c9334ad3e8d29bb05491e64cab26bf10ab2787c0810868cdb734271e2a6ad30e3a3de0b8bd761789eeb74aa6680fe9a6bb29b1b89b2ea5df054cd81f186aa76e36dfb184cb08986cd62bf395103c40d8da3c9d31cc0055602f42d4ebc4c12ef4d13bac78d04f62550dcd8285411ab07ab45d3bcccbe947f50a3fec2c7c5cb098d835d1624fef432bce2e51db908fd82758690cacb4e61c9b83c80487396ed99aa9005540f6c31990f43ef5c424a4789708dfd7d8318dfce0a2eb7461eb601ab4e98c92c936a8ac88fcaaea7cf7435d09be9be1c4ace336ca4a519a540b9a9159dad5950fdb1a77fa5861bbbf1ab5578babdaed165f20effdfb4794f1b4fdbe428ec5608d23478b70349334ba712bb48651cc496abcd660c608037ad43fdfa1fd8dbbc5d615fa0b14c83fd0a637d93f6f861f1b095ff58fb9157cdeb5fd6b700397e3bd151884a4f0c5922f6582bb030ce5f10fc7c13021c00f1dbda95f6e1bf4f8db27ec7e9b91b3bfa03a54cde4c866f2aeeb3ac2cbf099637a18dc7adbc0353fe8951997f393d35d68f971fb82037ff0f75e1cc90654f877c715f1aec5b4a1eb42bbd123696bd176299262f1c7c12f140bb0e4b41ac50f30e38cae4ba7b16342677fd946cc2469174006dc4ce89a89a6700dbb6e3e5fb0b1b9e030e2da62bde2775ed71b943e8289d1d53bc5cc58ae5ec0b6fe902d0ff1da822ab666ad57777e536ae83c2f2a983522738f1e88d18d272fcde2ee592329951c637bf65e2a48909ccc0f4c11854fbe9879b3a48d2e84c26564b811c688e886ac0c33ed8fe2c0d6e150abf754c5bcabfccb68f25c350d439920147198339cefbb56268aabf065ccaecacd9a171b6c403d4365797e814430c1a19584bea6fcc5a7f5da1e7c6b1789202df224b3d34ac981fdbdefdd0f833048db19a9525a5da73c5c78b91434565ec07c60b9c38b8d7e907cf59b84096da131b673eb0ff63c8850aedecc9340acc07f4efed5274f88f44cfdb4a72f3e72fb8a97686a0e8229b4a848a88d70c2fb54b32f82a5a6cc1c1e1ce89165fef653558829d689075c3fd6c8390635c90f37cb0846654119ffb3af7569ab8bd76fbed44fe6a114410cac2239a552fcad18cb05f194cffe1f8f7103aad89d8bca10f11e5b6d1847d5d96010201c9586cb7cd8643b6a2343b510b64158d842662ba6e9ded60bf83ead149318b9c05de53bb232fb4ec46f1718f097c6709e6264257849100a0b3ca26b2b9ed5caa6ed19d649e86ffc37be8498b4c741f498eb70253a135513285b8cf811376db06f02bfcfb8d4a4a3b33773329f36569d8cbee079f9d8b5121934e9f84233c4f70ecceab2f8f93e44ed3a1f334f7f2972cf9b763b994bbc14ba8ff374e59d6b8107dc822ca43bc157462a5488a72f30f35366a37ed61036e6709213025994a8ba0a975d136fc09dfdcf8d4518504a0d20e3331664af69ebd6bb234fa9159d3a7816e9da4e92088b676a2aa266c842604d7f66d741936985a4bca222a3f0ab6b6329feb143283362460049439900b30027ec57f4e15ae4d9c90974bcbc7cc6bd4d5fea3a67aca3ec1b54c18633f080c4847a4c789d362d54f53e47c897a13c275697c85bf84facf0322770d44915a7d94e6da975d9b658d75c14b5a287439dba299595d08b6d6c2021a10a6aefa9b8bb6c274a2fa67d1bb5d0b308e4c0bd61dfd25483ceef715d4eb69cdf8912ac1b6c76fd8cc7a8dc7a179e2d7474609477bcbe028e80bc9564b9f3682284f245337662f555739543ca15b0475aea629573e67c1bdc599d49d6aa0961f61e2e4c3fd1f035e180847779440dcb7aa646046fef4ba257d37717db3f5ee4f05600887df47d929b0ff7e0871d0f0af979b0a0cf32f1e59e6a13d758f039c620c7dbacdd4bf2189e7098ef9741d50f0ea887621c6e88c729d24bca5a3a9ae3828bedec867b532f7f25641cd13cef4df987a84ce41b06fa0339e96cda3b0b10f57aa5230631f898e0b76d38ac010f4ef0f8ba95fdb0023fc29c7257c02587a358ff73b9861255b02e1d85b4cac9f86ba30c1876bfe119eeecbf86162ddb646b8fb7d3e2d10ef4b14cc121fbf43c952fbf34b9c71338fbaaa353fd793d5aed69d920c99e708e6d3563893a40565ace6e8689aadc3fc69fb3c8c33da76a3638417d7aa25080b7c41f1818ace5a24d630f5d8ee838fe970bba086c2e4683b9aaa7235710b8314530485b1b3146429c01d6f3659a0ccd44d4953354d657e541a46795bcd268c7873c7f24170bdaa127ab8687264f1e75aba3430d53e47d181192bbc9c364dc90cbee253b0cdec177f0f987a5684a32e42367c7cc1d44cd1420b02530c58d444550b0251d73dd978c9c7c559fea43f4adbb5a7c630ccb8a0000, NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `user_devices`
--

CREATE TABLE `user_devices` (
  `id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('android','ios','web') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'web',
  `last_active` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `user_devices`
--

INSERT INTO `user_devices` (`id`, `user_id`, `token`, `platform`, `last_active`, `created_at`) VALUES
(1307, 531, 'csUTuJ-7QMq3weMzNZ5_nS:APA91bHwonGot6U_tN2Yibd7Hyhb9W4fSbAQwn8OSEcRkrjiUaPy5h3ewOgVDZ9_3NMpEIcQT3F5YklidfF7LlhfOfvO4SpNQiTwyXra3HfvLPk9zAgfGNo', 'android', '2026-01-24 02:10:09', '2026-01-22 16:27:14');

-- --------------------------------------------------------

--
-- Estrutura para tabela `_auth_otp`
--

CREATE TABLE `_auth_otp` (
  `id` int NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `_auth_otp`
--

INSERT INTO `_auth_otp` (`id`, `otp_hash`, `expires_at`, `used`, `created_at`) VALUES
(1, '$2b$10$oaWU.Dxq86vgF4vCiUuPLeGxASTk.5T1e5C92yH9j5PrqX969ZlZW', '2026-01-09 10:15:03', 1, '2026-01-09 13:05:03');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `ai_embeddings`
--
ALTER TABLE `ai_embeddings`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `ai_training_examples`
--
ALTER TABLE `ai_training_examples`
  ADD PRIMARY KEY (`id`),
  ADD KEY `profession_id` (`profession_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Índices de tabela `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_provider_date` (`provider_id`,`start_time`),
  ADD KEY `fk_app_client` (`client_id`),
  ADD KEY `fk_app_service` (`service_request_id`);

--
-- Índices de tabela `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `action` (`action`),
  ADD KEY `created_at` (`created_at`);

--
-- Índices de tabela `auth_users`
--
ALTER TABLE `auth_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Índices de tabela `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Índices de tabela `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cp` (`client_id`,`provider_id`),
  ADD KEY `idx_req` (`request_id`);

--
-- Índices de tabela `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `missions`
--
ALTER TABLE `missions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_geo` (`lat`,`lng`);

--
-- Índices de tabela `mission_media`
--
ALTER TABLE `mission_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mission` (`mission_id`);

--
-- Índices de tabela `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices de tabela `notification_devices`
--
ALTER TABLE `notification_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_user_token` (`user_id`,`token`),
  ADD KEY `idx_user` (`user_id`);

--
-- Índices de tabela `notification_prefs`
--
ALTER TABLE `notification_prefs`
  ADD PRIMARY KEY (`user_id`);

--
-- Índices de tabela `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mission` (`mission_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_id` (`mp_payment_id`),
  ADD KEY `idx_external` (`external_ref`);

--
-- Índices de tabela `professions`
--
ALTER TABLE `professions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_professions_name` (`name`);
ALTER TABLE `professions` ADD FULLTEXT KEY `name` (`name`,`keywords`);
ALTER TABLE `professions` ADD FULLTEXT KEY `ft_professions_name_keywords` (`name`,`keywords`);

--
-- Índices de tabela `proposals`
--
ALTER TABLE `proposals`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `providers`
--
ALTER TABLE `providers`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_providers_document` (`document_value`);

--
-- Índices de tabela `provider_custom_services`
--
ALTER TABLE `provider_custom_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_provider_custom_services_provider` (`provider_id`);

--
-- Índices de tabela `provider_locations`
--
ALTER TABLE `provider_locations`
  ADD PRIMARY KEY (`provider_id`),
  ADD KEY `idx_lat_lng` (`latitude`,`longitude`);

--
-- Índices de tabela `provider_media`
--
ALTER TABLE `provider_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`);

--
-- Índices de tabela `provider_penalties`
--
ALTER TABLE `provider_penalties`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `provider_professions`
--
ALTER TABLE `provider_professions`
  ADD PRIMARY KEY (`provider_user_id`,`profession_id`);

--
-- Índices de tabela `provider_schedules`
--
ALTER TABLE `provider_schedules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_provider_day_unique` (`provider_id`,`day_of_week`),
  ADD KEY `idx_provider_schedules_provider` (`provider_id`);

--
-- Índices de tabela `provider_schedule_configs`
--
ALTER TABLE `provider_schedule_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_provider_day` (`provider_id`,`day_of_week`),
  ADD UNIQUE KEY `unique_provider_day` (`provider_id`,`day_of_week`);

--
-- Índices de tabela `provider_schedule_exceptions`
--
ALTER TABLE `provider_schedule_exceptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_provider_date` (`provider_id`,`date`),
  ADD KEY `idx_provider_schedule_exceptions_provider` (`provider_id`);

--
-- Índices de tabela `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_review` (`service_id`,`reviewer_id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `reviewee_id` (`reviewee_id`);

--
-- Índices de tabela `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Índices de tabela `service_conversations`
--
ALTER TABLE `service_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cp2` (`client_id`,`provider_id`),
  ADD KEY `idx_req2` (`request_id`);

--
-- Índices de tabela `service_dispatches`
--
ALTER TABLE `service_dispatches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_service_dispatches_status` (`status`),
  ADD KEY `idx_service_dispatches_service_id` (`service_id`);

--
-- Índices de tabela `service_edit_requests`
--
ALTER TABLE `service_edit_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `provider_id` (`provider_id`);

--
-- Índices de tabela `service_media`
--
ALTER TABLE `service_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`);

--
-- Índices de tabela `service_messages`
--
ALTER TABLE `service_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conv2` (`conversation_id`);

--
-- Índices de tabela `service_rejections`
--
ALTER TABLE `service_rejections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_rejection` (`service_id`,`provider_id`);

--
-- Índices de tabela `service_requests`
--
ALTER TABLE `service_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `provider_id` (`provider_id`),
  ADD KEY `idx_task_id` (`task_id`);

--
-- Índices de tabela `service_reviews`
--
ALTER TABLE `service_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_req2` (`request_id`),
  ADD KEY `idx_provider` (`provider_id`);

--
-- Índices de tabela `service_tasks`
--
ALTER TABLE `service_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_service_tasks_service` (`service_id`);

--
-- Índices de tabela `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`key_name`);

--
-- Índices de tabela `task_catalog`
--
ALTER TABLE `task_catalog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_catalog_profession` (`profession_id`);

--
-- Índices de tabela `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `firebase_uid` (`firebase_uid`),
  ADD KEY `idx_firebase_uid` (`firebase_uid`);

--
-- Índices de tabela `user_devices`
--
ALTER TABLE `user_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_user_token` (`user_id`,`token`);

--
-- Índices de tabela `_auth_otp`
--
ALTER TABLE `_auth_otp`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `ai_embeddings`
--
ALTER TABLE `ai_embeddings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `ai_training_examples`
--
ALTER TABLE `ai_training_examples`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de tabela `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `auth_users`
--
ALTER TABLE `auth_users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de tabela `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de tabela `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `missions`
--
ALTER TABLE `missions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `mission_media`
--
ALTER TABLE `mission_media`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `notification_devices`
--
ALTER TABLE `notification_devices`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=291;

--
-- AUTO_INCREMENT de tabela `professions`
--
ALTER TABLE `professions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4285;

--
-- AUTO_INCREMENT de tabela `proposals`
--
ALTER TABLE `proposals`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `provider_custom_services`
--
ALTER TABLE `provider_custom_services`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=226;

--
-- AUTO_INCREMENT de tabela `provider_media`
--
ALTER TABLE `provider_media`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `provider_penalties`
--
ALTER TABLE `provider_penalties`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `provider_schedules`
--
ALTER TABLE `provider_schedules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=240;

--
-- AUTO_INCREMENT de tabela `provider_schedule_configs`
--
ALTER TABLE `provider_schedule_configs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT de tabela `provider_schedule_exceptions`
--
ALTER TABLE `provider_schedule_exceptions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `services`
--
ALTER TABLE `services`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `service_categories`
--
ALTER TABLE `service_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=182;

--
-- AUTO_INCREMENT de tabela `service_conversations`
--
ALTER TABLE `service_conversations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `service_dispatches`
--
ALTER TABLE `service_dispatches`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT de tabela `service_edit_requests`
--
ALTER TABLE `service_edit_requests`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `service_media`
--
ALTER TABLE `service_media`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT de tabela `service_messages`
--
ALTER TABLE `service_messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `service_rejections`
--
ALTER TABLE `service_rejections`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de tabela `service_reviews`
--
ALTER TABLE `service_reviews`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `service_tasks`
--
ALTER TABLE `service_tasks`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4308;

--
-- AUTO_INCREMENT de tabela `task_catalog`
--
ALTER TABLE `task_catalog`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=346;

--
-- AUTO_INCREMENT de tabela `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=878;

--
-- AUTO_INCREMENT de tabela `user_devices`
--
ALTER TABLE `user_devices`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1382;

--
-- AUTO_INCREMENT de tabela `_auth_otp`
--
ALTER TABLE `_auth_otp`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_app_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_app_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_app_service` FOREIGN KEY (`service_request_id`) REFERENCES `service_requests` (`id`) ON DELETE SET NULL;

--
-- Restrições para tabelas `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  ADD CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`);

--
-- Restrições para tabelas `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `providers`
--
ALTER TABLE `providers`
  ADD CONSTRAINT `providers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `provider_custom_services`
--
ALTER TABLE `provider_custom_services`
  ADD CONSTRAINT `provider_custom_services_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `provider_schedules`
--
ALTER TABLE `provider_schedules`
  ADD CONSTRAINT `provider_schedules_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `provider_schedule_configs`
--
ALTER TABLE `provider_schedule_configs`
  ADD CONSTRAINT `fk_sched_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `provider_schedule_exceptions`
--
ALTER TABLE `provider_schedule_exceptions`
  ADD CONSTRAINT `provider_schedule_exceptions_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `service_edit_requests`
--
ALTER TABLE `service_edit_requests`
  ADD CONSTRAINT `service_edit_requests_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  ADD CONSTRAINT `service_edit_requests_ibfk_2` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`);

--
-- Restrições para tabelas `service_media`
--
ALTER TABLE `service_media`
  ADD CONSTRAINT `service_media_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `service_requests`
--
ALTER TABLE `service_requests`
  ADD CONSTRAINT `fk_service_requests_task_id` FOREIGN KEY (`task_id`) REFERENCES `task_catalog` (`id`),
  ADD CONSTRAINT `service_requests_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `service_requests_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `service_categories` (`id`),
  ADD CONSTRAINT `service_requests_ibfk_3` FOREIGN KEY (`provider_id`) REFERENCES `providers` (`user_id`);

--
-- Restrições para tabelas `service_tasks`
--
ALTER TABLE `service_tasks`
  ADD CONSTRAINT `service_tasks_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `task_catalog`
--
ALTER TABLE `task_catalog`
  ADD CONSTRAINT `task_catalog_ibfk_1` FOREIGN KEY (`profession_id`) REFERENCES `professions` (`id`);

--
-- Restrições para tabelas `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `service_requests` (`id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Restrições para tabelas `user_devices`
--
ALTER TABLE `user_devices`
  ADD CONSTRAINT `user_devices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
