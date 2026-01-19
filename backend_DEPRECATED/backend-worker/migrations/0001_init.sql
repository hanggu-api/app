-- CreateTable
CREATE TABLE "ai_embeddings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profession_id" INTEGER NOT NULL,
    "profession_name" TEXT,
    "category_id" INTEGER,
    "category_name" TEXT,
    "text" TEXT,
    "embedding" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ai_training_examples" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profession_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "text" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT DEFAULT 'box',
    "slug" TEXT
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT,
    "type" TEXT DEFAULT 'text',
    "sent_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "read_at" DATETIME,
    CONSTRAINT "chat_messages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "locations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" INTEGER NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "seen_by_user_at" DATETIME,
    "seen_by_provider_at" DATETIME
);

-- CreateTable
CREATE TABLE "mission_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "missions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "lat" DECIMAL,
    "lng" DECIMAL,
    "budget" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "provider_id" INTEGER,
    "category" TEXT
);

-- CreateTable
CREATE TABLE "notification_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "last_seen_at" DATETIME
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "user_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "allow_payment" INTEGER NOT NULL DEFAULT 1,
    "allow_mission" INTEGER NOT NULL DEFAULT 1,
    "allow_chat" INTEGER NOT NULL DEFAULT 1,
    "allow_general" INTEGER NOT NULL DEFAULT 1,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "type" TEXT NOT NULL,
    "related_id" TEXT,
    "read_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mission_id" TEXT NOT NULL,
    "proposal_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "provider_id" INTEGER,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mp_preference_id" TEXT,
    "mp_payment_id" TEXT,
    "external_ref" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    "status_detail" TEXT,
    "payment_method_id" TEXT,
    "payer_email" TEXT,
    "collector_id" TEXT,
    "net_received" DECIMAL,
    "fee_amount" DECIMAL,
    "installments" INTEGER,
    "card_last_four" TEXT,
    "order_id" TEXT,
    "refund_status" TEXT,
    "refund_amount" DECIMAL,
    "refunded_at" DATETIME,
    "canceled_at" DATETIME,
    "money_release_date" DATETIME
);

-- CreateTable
CREATE TABLE "professions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category_id" INTEGER,
    "icon" TEXT,
    "keywords" TEXT,
    "search_vector" TEXT,
    "popularity_score" INTEGER DEFAULT 0,
    "service_type" TEXT NOT NULL DEFAULT 'on_site',
    CONSTRAINT "professions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "deadline_days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "provider_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "provider_penalties" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER NOT NULL,
    "reason" TEXT,
    "applied_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "provider_professions" (
    "provider_user_id" BIGINT NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "fixed_price" DECIMAL,
    "hourly_rate" DECIMAL,

    PRIMARY KEY ("provider_user_id", "profession_id"),
    CONSTRAINT "provider_professions_provider_user_id_fkey" FOREIGN KEY ("provider_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "provider_professions_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "providers" (
    "user_id" BIGINT NOT NULL PRIMARY KEY,
    "bio" TEXT,
    "address" TEXT,
    "rating_avg" DECIMAL DEFAULT 0.00,
    "rating_count" INTEGER DEFAULT 0,
    "wallet_balance" DECIMAL DEFAULT 0.00,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "is_online" BOOLEAN DEFAULT false,
    "document_type" TEXT,
    "document_value" TEXT,
    "commercial_name" TEXT,
    CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "reviewer_id" BIGINT NOT NULL,
    "reviewee_id" BIGINT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon_slug" TEXT
);

-- CreateTable
CREATE TABLE "service_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "request_id" INTEGER,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_edit_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL NOT NULL,
    "platform_fee" DECIMAL NOT NULL,
    "images_json" TEXT,
    "video_key" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "decided_at" DATETIME,
    CONSTRAINT "service_edit_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_edit_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "service_dispatches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "provider_list" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_cycle" INTEGER NOT NULL DEFAULT 1,
    "current_provider_index" INTEGER NOT NULL DEFAULT 0,
    "history" TEXT,
    "last_attempt_at" DATETIME,
    "next_retry_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME
);

-- CreateTable
CREATE TABLE "service_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "media_key" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_media_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "service_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_rejections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" BIGINT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "profession" TEXT,
    "provider_id" BIGINT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting_payment',
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "address" TEXT,
    "price_estimated" DECIMAL,
    "price_upfront" DECIMAL,
    "provider_amount" DECIMAL,
    "scheduled_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "location_type" TEXT DEFAULT 'client',
    "arrived_at" DATETIME,
    "payment_remaining_status" TEXT DEFAULT 'pending',
    "contest_reason" TEXT,
    "contest_status" TEXT DEFAULT 'none',
    "contest_evidence" TEXT,
    "validation_code" TEXT,
    "proof_photo" TEXT,
    "proof_video" TEXT,
    "proof_code" TEXT,
    "completion_code" TEXT,
    "completion_requested_at" DATETIME,
    "status_updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "service_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "service_reviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "request_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "service_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1.00,
    "unit_price" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_tasks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "provider_id" INTEGER,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "task_catalog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profession_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pricing_type" TEXT NOT NULL DEFAULT 'fixed',
    "unit_name" TEXT,
    "unit_price" DECIMAL NOT NULL,
    "keywords" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_catalog_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "service_id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "provider_ref" TEXT,
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "last_active" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firebase_uid" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'client',
    "phone" TEXT,
    "avatar_url" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN DEFAULT false,
    "avatar_blob" BLOB,
    "avatar_mime" TEXT,
    "status" TEXT DEFAULT 'active'
);

-- CreateTable
CREATE TABLE "provider_schedule_exceptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "date" DATETIME NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "reason" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_schedule_exceptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "provider_locations" (
    "provider_id" BIGINT NOT NULL PRIMARY KEY,
    "latitude" DECIMAL NOT NULL,
    "longitude" DECIMAL NOT NULL,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_locations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "provider_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "break_start" TEXT,
    "break_end" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "provider_schedules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "provider_custom_services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_custom_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "auth_otp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "otp_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" INTEGER DEFAULT 0,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "client_id" BIGINT,
    "service_request_id" TEXT,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users" ("id") ON UPDATE NO ACTION,
    CONSTRAINT "appointments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "appointments_service_request_id_fkey" FOREIGN KEY ("service_request_id") REFERENCES "service_requests" ("id") ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" BIGINT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "provider_schedule_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider_id" BIGINT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "lunch_start" DATETIME,
    "lunch_end" DATETIME,
    "slot_duration" INTEGER DEFAULT 30,
    CONSTRAINT "provider_schedule_configs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key_name" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT,
    "description" TEXT,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX "conversations_client_id_provider_id_idx" ON "conversations"("client_id", "provider_id");

-- CreateIndex
CREATE INDEX "conversations_request_id_idx" ON "conversations"("request_id");

-- CreateIndex
CREATE INDEX "mission_media_mission_id_idx" ON "mission_media"("mission_id");

-- CreateIndex
CREATE INDEX "missions_category_idx" ON "missions"("category");

-- CreateIndex
CREATE INDEX "missions_created_at_idx" ON "missions"("created_at");

-- CreateIndex
CREATE INDEX "missions_lat_lng_idx" ON "missions"("lat", "lng");

-- CreateIndex
CREATE INDEX "missions_status_idx" ON "missions"("status");

-- CreateIndex
CREATE INDEX "notification_devices_user_id_idx" ON "notification_devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_devices_user_id_token_key" ON "notification_devices"("user_id", "token");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "payments_external_ref_idx" ON "payments"("external_ref");

-- CreateIndex
CREATE INDEX "payments_mission_id_idx" ON "payments"("mission_id");

-- CreateIndex
CREATE INDEX "payments_mp_payment_id_idx" ON "payments"("mp_payment_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "professions_name_key" ON "professions"("name");

-- CreateIndex
CREATE INDEX "provider_media_user_id_idx" ON "provider_media"("user_id");

-- CreateIndex
CREATE INDEX "providers_document_value_idx" ON "providers"("document_value");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_service_id_reviewer_id_key" ON "reviews"("service_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE INDEX "service_conversations_client_id_provider_id_idx" ON "service_conversations"("client_id", "provider_id");

-- CreateIndex
CREATE INDEX "service_conversations_request_id_idx" ON "service_conversations"("request_id");

-- CreateIndex
CREATE INDEX "service_edit_requests_provider_id_idx" ON "service_edit_requests"("provider_id");

-- CreateIndex
CREATE INDEX "service_edit_requests_service_id_idx" ON "service_edit_requests"("service_id");

-- CreateIndex
CREATE INDEX "service_dispatches_status_idx" ON "service_dispatches"("status");

-- CreateIndex
CREATE INDEX "service_dispatches_service_id_idx" ON "service_dispatches"("service_id");

-- CreateIndex
CREATE INDEX "service_media_service_id_idx" ON "service_media"("service_id");

-- CreateIndex
CREATE INDEX "service_messages_conversation_id_idx" ON "service_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_rejections_service_id_provider_id_key" ON "service_rejections"("service_id", "provider_id");

-- CreateIndex
CREATE INDEX "service_requests_category_id_idx" ON "service_requests"("category_id");

-- CreateIndex
CREATE INDEX "service_requests_client_id_idx" ON "service_requests"("client_id");

-- CreateIndex
CREATE INDEX "service_requests_provider_id_idx" ON "service_requests"("provider_id");

-- CreateIndex
CREATE INDEX "service_reviews_provider_id_idx" ON "service_reviews"("provider_id");

-- CreateIndex
CREATE INDEX "service_reviews_request_id_idx" ON "service_reviews"("request_id");

-- CreateIndex
CREATE INDEX "service_tasks_service_id_idx" ON "service_tasks"("service_id");

-- CreateIndex
CREATE INDEX "task_catalog_profession_id_idx" ON "task_catalog"("profession_id");

-- CreateIndex
CREATE INDEX "transactions_service_id_idx" ON "transactions"("service_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_token_key" ON "user_devices"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_firebase_uid_idx" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedule_exceptions_provider_id_date_key" ON "provider_schedule_exceptions"("provider_id", "date");

-- CreateIndex
CREATE INDEX "provider_schedule_exceptions_provider_id_idx" ON "provider_schedule_exceptions"("provider_id");

-- CreateIndex
CREATE INDEX "provider_locations_latitude_longitude_idx" ON "provider_locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "provider_schedules_provider_id_idx" ON "provider_schedules"("provider_id");

-- CreateIndex
CREATE INDEX "provider_custom_services_provider_id_idx" ON "provider_custom_services"("provider_id");

-- CreateIndex
CREATE INDEX "appointments_client_id_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_service_request_id_idx" ON "appointments"("service_request_id");

-- CreateIndex
CREATE INDEX "appointments_provider_id_start_time_idx" ON "appointments"("provider_id", "start_time");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedule_configs_provider_id_day_of_week_key" ON "provider_schedule_configs"("provider_id", "day_of_week");
