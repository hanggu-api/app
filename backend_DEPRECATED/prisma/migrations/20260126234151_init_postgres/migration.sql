-- CreateEnum
CREATE TYPE "messages_sender" AS ENUM ('client', 'provider');

-- CreateEnum
CREATE TYPE "auth_users_role" AS ENUM ('client', 'provider');

-- CreateEnum
CREATE TYPE "service_media_media_type" AS ENUM ('image', 'video', 'audio');

-- CreateEnum
CREATE TYPE "task_catalog_pricing_type" AS ENUM ('fixed', 'per_unit');

-- CreateEnum
CREATE TYPE "user_devices_platform" AS ENUM ('android', 'ios', 'web');

-- CreateEnum
CREATE TYPE "chat_messages_type" AS ENUM ('text', 'image', 'audio', 'location', 'video');

-- CreateEnum
CREATE TYPE "transactions_type" AS ENUM ('deposit', 'final_payment', 'payout', 'refund');

-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('client', 'provider', 'admin');

-- CreateEnum
CREATE TYPE "transactions_status" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "providers_document_type" AS ENUM ('cpf', 'cnpj');

-- CreateEnum
CREATE TYPE "service_edit_requests_status" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "appointments_status" AS ENUM ('scheduled', 'completed', 'cancelled', 'busy');

-- CreateEnum
CREATE TYPE "service_requests_status" AS ENUM ('waiting_payment', 'pending', 'accepted', 'waiting_payment_remaining', 'in_progress', 'waiting_client_confirmation', 'completed', 'cancelled', 'contested');

-- CreateEnum
CREATE TYPE "professions_service_type" AS ENUM ('on_site', 'at_provider', 'remote');

-- CreateEnum
CREATE TYPE "service_requests_location_type" AS ENUM ('client', 'provider');

-- CreateEnum
CREATE TYPE "service_requests_payment_remaining_status" AS ENUM ('pending', 'paid');

-- CreateEnum
CREATE TYPE "service_requests_contest_status" AS ENUM ('none', 'pending', 'resolved');

-- CreateTable
CREATE TABLE "ai_embeddings" (
    "id" SERIAL NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "profession_name" TEXT,
    "category_id" INTEGER,
    "category_name" TEXT,
    "text" TEXT,
    "embedding" JSONB,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_training_examples" (
    "id" SERIAL NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "text" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_training_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "auth_users_role" NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" VARCHAR(50) DEFAULT 'box',
    "slug" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT,
    "type" "chat_messages_type" DEFAULT 'text',
    "sent_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(0),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "sender" "messages_sender" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "seen_by_user_at" TIMESTAMP(0),
    "seen_by_provider_at" TIMESTAMP(0),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_media" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "s3_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "budget" DECIMAL(10,2),
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "provider_id" INTEGER,
    "category" VARCHAR(64),

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(256) NOT NULL,
    "platform" VARCHAR(32),
    "last_seen_at" TIMESTAMP(0),

    CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "user_id" INTEGER NOT NULL,
    "allow_payment" SMALLINT NOT NULL DEFAULT 1,
    "allow_mission" SMALLINT NOT NULL DEFAULT 1,
    "allow_chat" SMALLINT NOT NULL DEFAULT 1,
    "allow_general" SMALLINT NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "related_id" TEXT,
    "read_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "mission_id" VARCHAR(36) NOT NULL,
    "proposal_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "provider_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'BRL',
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "mp_preference_id" VARCHAR(64),
    "mp_payment_id" VARCHAR(64),
    "external_ref" VARCHAR(128),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),
    "status_detail" VARCHAR(64),
    "payment_method_id" VARCHAR(32),
    "payer_email" TEXT,
    "collector_id" VARCHAR(32),
    "net_received" DECIMAL(10,2),
    "fee_amount" DECIMAL(10,2),
    "installments" INTEGER,
    "card_last_four" VARCHAR(8),
    "order_id" VARCHAR(64),
    "refund_status" VARCHAR(32),
    "refund_amount" DECIMAL(10,2),
    "refunded_at" TIMESTAMP(0),
    "canceled_at" TIMESTAMP(0),
    "money_release_date" TIMESTAMP(0),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "category_id" INTEGER,
    "icon" VARCHAR(64),
    "keywords" TEXT,
    "search_vector" JSONB,
    "popularity_score" INTEGER DEFAULT 0,
    "service_type" "professions_service_type" NOT NULL DEFAULT 'on_site',

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" SERIAL NOT NULL,
    "mission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "deadline_days" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_media" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "s3_key" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_penalties" (
    "id" SERIAL NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER NOT NULL,
    "reason" TEXT,
    "applied_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_professions" (
    "provider_user_id" BIGINT NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "fixed_price" DECIMAL(10,2),
    "hourly_rate" DECIMAL(10,2),

    CONSTRAINT "provider_professions_pkey" PRIMARY KEY ("provider_user_id","profession_id")
);

-- CreateTable
CREATE TABLE "providers" (
    "user_id" BIGINT NOT NULL,
    "bio" TEXT,
    "address" TEXT,
    "rating_avg" DECIMAL(3,2) DEFAULT 0.00,
    "rating_count" INTEGER DEFAULT 0,
    "wallet_balance" DECIMAL(10,2) DEFAULT 0.00,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_online" BOOLEAN DEFAULT false,
    "document_type" "providers_document_type",
    "document_value" VARCHAR(20),
    "commercial_name" VARCHAR(100),

    CONSTRAINT "providers_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "service_id" CHAR(36) NOT NULL,
    "reviewer_id" BIGINT NOT NULL,
    "reviewee_id" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "icon_slug" VARCHAR(50),

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_conversations" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_edit_requests" (
    "id" BIGSERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL(10,2) NOT NULL,
    "platform_fee" DECIMAL(10,2) NOT NULL,
    "images_json" TEXT,
    "video_key" TEXT,
    "status" "service_edit_requests_status" DEFAULT 'pending',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(0),

    CONSTRAINT "service_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_dispatches" (
    "id" SERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "provider_list" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "current_cycle" INTEGER NOT NULL DEFAULT 1,
    "current_provider_index" INTEGER NOT NULL DEFAULT 0,
    "history" JSONB,
    "last_attempt_at" TIMESTAMP(0),
    "next_retry_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "service_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_media" (
    "id" BIGSERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "media_key" TEXT NOT NULL,
    "media_type" "service_media_media_type" NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_rejections" (
    "id" SERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" VARCHAR(36) NOT NULL,
    "client_id" BIGINT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "profession" VARCHAR(128),
    "provider_id" BIGINT,
    "description" TEXT,
    "status" "service_requests_status" NOT NULL DEFAULT 'waiting_payment',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "address" TEXT,
    "price_estimated" DECIMAL(10,2),
    "price_upfront" DECIMAL(10,2),
    "scheduled_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "location_type" "service_requests_location_type" DEFAULT 'client',
    "arrived_at" TIMESTAMP(0),
    "payment_remaining_status" "service_requests_payment_remaining_status" DEFAULT 'pending',
    "contest_reason" TEXT,
    "contest_status" "service_requests_contest_status" DEFAULT 'none',
    "contest_evidence" JSONB,
    "validation_code" VARCHAR(10),
    "proof_photo" TEXT,
    "proof_video" TEXT,
    "proof_code" TEXT,
    "status_updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(0),

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_reviews" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tasks" (
    "id" BIGSERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_catalog" (
    "id" SERIAL NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pricing_type" "task_catalog_pricing_type" NOT NULL DEFAULT 'fixed',
    "unit_name" VARCHAR(64),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "keywords" VARCHAR(1000),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" BIGSERIAL NOT NULL,
    "service_id" VARCHAR(36) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "transactions_type" NOT NULL,
    "status" "transactions_status" DEFAULT 'pending',
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "platform" "user_devices_platform" NOT NULL DEFAULT 'web',
    "last_active" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "firebase_uid" VARCHAR(128),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "role" "users_role" NOT NULL DEFAULT 'client',
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN DEFAULT false,
    "avatar_blob" BYTEA,
    "avatar_mime" VARCHAR(64),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_schedule_exceptions" (
    "id" SERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "reason" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_locations" (
    "provider_id" BIGINT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_locations_pkey" PRIMARY KEY ("provider_id")
);

-- CreateTable
CREATE TABLE "provider_schedules" (
    "id" SERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_start" VARCHAR(5),
    "break_end" VARCHAR(5),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "provider_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_custom_services" (
    "id" SERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(50),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_custom_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_auth_otp" (
    "id" SERIAL NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(0) NOT NULL,
    "used" SMALLINT DEFAULT 0,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_auth_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "client_id" BIGINT,
    "service_request_id" VARCHAR(36),
    "start_time" TIMESTAMP(0) NOT NULL,
    "end_time" TIMESTAMP(0) NOT NULL,
    "status" "appointments_status" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" VARCHAR(100),
    "details" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_schedule_configs" (
    "id" SERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "lunch_start" TIME(0),
    "lunch_end" TIME(0),
    "slot_duration" INTEGER DEFAULT 30,

    CONSTRAINT "provider_schedule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key_name" VARCHAR(50) NOT NULL,
    "value" JSONB,
    "description" TEXT,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key_name")
);

-- CreateIndex
CREATE INDEX "ai_training_examples_category_id_idx" ON "ai_training_examples"("category_id");

-- CreateIndex
CREATE INDEX "ai_training_examples_profession_id_idx" ON "ai_training_examples"("profession_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_messages_service_id_idx" ON "chat_messages"("service_id");

-- CreateIndex
CREATE INDEX "conversations_idx_cp_idx" ON "conversations"("client_id", "provider_id");

-- CreateIndex
CREATE INDEX "conversations_idx_req_idx" ON "conversations"("request_id");

-- CreateIndex
CREATE INDEX "mission_media_idx_mission_idx" ON "mission_media"("mission_id");

-- CreateIndex
CREATE INDEX "missions_idx_category_idx" ON "missions"("category");

-- CreateIndex
CREATE INDEX "missions_idx_created_idx" ON "missions"("created_at");

-- CreateIndex
CREATE INDEX "missions_idx_geo_idx" ON "missions"("lat", "lng");

-- CreateIndex
CREATE INDEX "missions_idx_status_idx" ON "missions"("status");

-- CreateIndex
CREATE INDEX "notification_devices_idx_user_idx" ON "notification_devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_uniq_user_token_key" ON "notification_devices"("user_id", "token");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "payments_idx_external_idx" ON "payments"("external_ref");

-- CreateIndex
CREATE INDEX "payments_idx_mission_idx" ON "payments"("mission_id");

-- CreateIndex
CREATE INDEX "payments_idx_payment_id_idx" ON "payments"("mp_payment_id");

-- CreateIndex
CREATE INDEX "payments_idx_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "professions_uniq_professions_name_key" ON "professions"("name");

-- CreateIndex
CREATE INDEX "provider_media_idx_user_idx" ON "provider_media"("user_id");

-- CreateIndex
CREATE INDEX "providers_idx_providers_document_idx" ON "providers"("document_value");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_unique_review_key" ON "reviews"("service_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "service_conversations_idx_cp2_idx" ON "service_conversations"("client_id", "provider_id");

-- CreateIndex
CREATE INDEX "service_conversations_idx_req2_idx" ON "service_conversations"("request_id");

-- CreateIndex
CREATE INDEX "service_edit_requests_provider_id_idx" ON "service_edit_requests"("provider_id");

-- CreateIndex
CREATE INDEX "service_edit_requests_service_id_idx" ON "service_edit_requests"("service_id");

-- CreateIndex
CREATE INDEX "service_dispatches_idx_service_dispatches_status_idx" ON "service_dispatches"("status");

-- CreateIndex
CREATE INDEX "service_dispatches_idx_service_dispatches_service_id_idx" ON "service_dispatches"("service_id");

-- CreateIndex
CREATE INDEX "service_media_service_id_idx" ON "service_media"("service_id");

-- CreateIndex
CREATE INDEX "service_messages_idx_conv2_idx" ON "service_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_rejections_unique_rejection_key" ON "service_rejections"("service_id", "provider_id");

-- CreateIndex
CREATE INDEX "service_requests_category_id_idx" ON "service_requests"("category_id");

-- CreateIndex
CREATE INDEX "service_requests_client_id_idx" ON "service_requests"("client_id");

-- CreateIndex
CREATE INDEX "service_requests_provider_id_idx" ON "service_requests"("provider_id");

-- CreateIndex
CREATE INDEX "service_reviews_idx_provider_idx" ON "service_reviews"("provider_id");

-- CreateIndex
CREATE INDEX "service_reviews_idx_req2_idx" ON "service_reviews"("request_id");

-- CreateIndex
CREATE INDEX "service_tasks_idx_service_tasks_service_idx" ON "service_tasks"("service_id");

-- CreateIndex
CREATE INDEX "task_catalog_idx_task_catalog_profession_idx" ON "task_catalog"("profession_id");

-- CreateIndex
CREATE INDEX "transactions_service_id_idx" ON "transactions"("service_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_idx_user_token_key" ON "user_devices"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_idx_firebase_uid_idx" ON "users"("firebase_uid");

-- CreateIndex
CREATE INDEX "provider_schedule_exceptions_i_a68b3dd3_idx" ON "provider_schedule_exceptions"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedule_exceptions_uniq_provider_date_key" ON "provider_schedule_exceptions"("provider_id", "date");

-- CreateIndex
CREATE INDEX "provider_locations_idx_lat_lng_idx" ON "provider_locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "provider_schedules_idx_provider_schedules_provider_idx" ON "provider_schedules"("provider_id");

-- CreateIndex
CREATE INDEX "provider_custom_services_idx_p_9593d06f_idx" ON "provider_custom_services"("provider_id");

-- CreateIndex
CREATE INDEX "appointments_fk_app_client_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_fk_app_service_idx" ON "appointments"("service_request_id");

-- CreateIndex
CREATE INDEX "appointments_idx_provider_date_idx" ON "appointments"("provider_id", "start_time");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedule_configs_uniq_provider_day_key" ON "provider_schedule_configs"("provider_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedule_configs_unique_provider_day_key" ON "provider_schedule_configs"("provider_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_ibfk_2_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ibfk_1_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_ibfk_1_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_ibfk_2_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_ibfk_3_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_edit_requests" ADD CONSTRAINT "service_edit_requests_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_edit_requests" ADD CONSTRAINT "service_edit_requests_ibfk_2_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_media" ADD CONSTRAINT "service_media_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_ibfk_1_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_ibfk_2_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_ibfk_3_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tasks" ADD CONSTRAINT "service_tasks_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_catalog" ADD CONSTRAINT "task_catalog_ibfk_1_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ibfk_1_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_ibfk_2_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_ibfk_1_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_schedule_exceptions" ADD CONSTRAINT "provider_schedule_exceptions_ibfk_1_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_ibfk_1_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_custom_services" ADD CONSTRAINT "provider_custom_services_ibfk_1_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_fk_app_client_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_fk_app_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_fk_app_service_fkey" FOREIGN KEY ("service_request_id") REFERENCES "service_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_schedule_configs" ADD CONSTRAINT "provider_schedule_configs_fk_sched_provider_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- RLS Policies (Injected)

ALTER TABLE "ai_embeddings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "ai_embeddings" USING (true) WITH CHECK (true);
ALTER TABLE "ai_training_examples" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "ai_training_examples" USING (true) WITH CHECK (true);
ALTER TABLE "auth_users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "auth_users" USING (true) WITH CHECK (true);
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "categories" USING (true) WITH CHECK (true);
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "chat_messages" USING (true) WITH CHECK (true);
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "conversations" USING (true) WITH CHECK (true);
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "locations" USING (true) WITH CHECK (true);
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "messages" USING (true) WITH CHECK (true);
ALTER TABLE "mission_media" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "mission_media" USING (true) WITH CHECK (true);
ALTER TABLE "missions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "missions" USING (true) WITH CHECK (true);
ALTER TABLE "notification_devices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "notification_devices" USING (true) WITH CHECK (true);
ALTER TABLE "notification_prefs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "notification_prefs" USING (true) WITH CHECK (true);
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "notifications" USING (true) WITH CHECK (true);
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "payments" USING (true) WITH CHECK (true);
ALTER TABLE "professions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "professions" USING (true) WITH CHECK (true);
ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "proposals" USING (true) WITH CHECK (true);
ALTER TABLE "provider_media" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_media" USING (true) WITH CHECK (true);
ALTER TABLE "provider_penalties" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_penalties" USING (true) WITH CHECK (true);
ALTER TABLE "provider_professions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_professions" USING (true) WITH CHECK (true);
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "providers" USING (true) WITH CHECK (true);
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "reviews" USING (true) WITH CHECK (true);
ALTER TABLE "service_categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_categories" USING (true) WITH CHECK (true);
ALTER TABLE "service_conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_conversations" USING (true) WITH CHECK (true);
ALTER TABLE "service_edit_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_edit_requests" USING (true) WITH CHECK (true);
ALTER TABLE "service_dispatches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_dispatches" USING (true) WITH CHECK (true);
ALTER TABLE "service_media" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_media" USING (true) WITH CHECK (true);
ALTER TABLE "service_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_messages" USING (true) WITH CHECK (true);
ALTER TABLE "service_rejections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_rejections" USING (true) WITH CHECK (true);
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_requests" USING (true) WITH CHECK (true);
ALTER TABLE "service_reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_reviews" USING (true) WITH CHECK (true);
ALTER TABLE "service_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "service_tasks" USING (true) WITH CHECK (true);
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "services" USING (true) WITH CHECK (true);
ALTER TABLE "task_catalog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "task_catalog" USING (true) WITH CHECK (true);
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "transactions" USING (true) WITH CHECK (true);
ALTER TABLE "user_devices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "user_devices" USING (true) WITH CHECK (true);
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "users" USING (true) WITH CHECK (true);
ALTER TABLE "provider_schedule_exceptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_schedule_exceptions" USING (true) WITH CHECK (true);
ALTER TABLE "provider_locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_locations" USING (true) WITH CHECK (true);
ALTER TABLE "provider_schedules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_schedules" USING (true) WITH CHECK (true);
ALTER TABLE "provider_custom_services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_custom_services" USING (true) WITH CHECK (true);
ALTER TABLE "_auth_otp" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "_auth_otp" USING (true) WITH CHECK (true);
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "appointments" USING (true) WITH CHECK (true);
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "audit_logs" USING (true) WITH CHECK (true);
ALTER TABLE "provider_schedule_configs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "provider_schedule_configs" USING (true) WITH CHECK (true);
ALTER TABLE "system_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for now" ON "system_settings" USING (true) WITH CHECK (true);