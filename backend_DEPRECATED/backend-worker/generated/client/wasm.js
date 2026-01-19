
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.Ai_embeddingsScalarFieldEnum = {
  id: 'id',
  profession_id: 'profession_id',
  profession_name: 'profession_name',
  category_id: 'category_id',
  category_name: 'category_name',
  text: 'text',
  embedding: 'embedding',
  created_at: 'created_at'
};

exports.Prisma.Ai_training_examplesScalarFieldEnum = {
  id: 'id',
  profession_id: 'profession_id',
  category_id: 'category_id',
  text: 'text',
  created_at: 'created_at'
};

exports.Prisma.Auth_usersScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  role: 'role'
};

exports.Prisma.CategoriesScalarFieldEnum = {
  id: 'id',
  name: 'name',
  icon: 'icon',
  slug: 'slug'
};

exports.Prisma.Chat_messagesScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  sender_id: 'sender_id',
  content: 'content',
  type: 'type',
  sent_at: 'sent_at',
  read_at: 'read_at'
};

exports.Prisma.ConversationsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  provider_id: 'provider_id',
  request_id: 'request_id',
  created_at: 'created_at'
};

exports.Prisma.LocationsScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  lat: 'lat',
  lng: 'lng',
  created_at: 'created_at'
};

exports.Prisma.MessagesScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  sender: 'sender',
  text: 'text',
  created_at: 'created_at',
  seen_by_user_at: 'seen_by_user_at',
  seen_by_provider_at: 'seen_by_provider_at'
};

exports.Prisma.Mission_mediaScalarFieldEnum = {
  id: 'id',
  mission_id: 'mission_id',
  user_id: 'user_id',
  kind: 'kind',
  s3_key: 's3_key',
  created_at: 'created_at'
};

exports.Prisma.MissionsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  title: 'title',
  description: 'description',
  location: 'location',
  lat: 'lat',
  lng: 'lng',
  budget: 'budget',
  status: 'status',
  created_at: 'created_at',
  provider_id: 'provider_id',
  category: 'category'
};

exports.Prisma.Notification_devicesScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  token: 'token',
  platform: 'platform',
  last_seen_at: 'last_seen_at'
};

exports.Prisma.Notification_registryScalarFieldEnum = {
  user_id: 'user_id',
  fcm_token: 'fcm_token',
  professions: 'professions',
  latitude: 'latitude',
  longitude: 'longitude',
  is_online: 'is_online',
  last_seen_at: 'last_seen_at'
};

exports.Prisma.Notification_prefsScalarFieldEnum = {
  user_id: 'user_id',
  allow_payment: 'allow_payment',
  allow_mission: 'allow_mission',
  allow_chat: 'allow_chat',
  allow_general: 'allow_general',
  updated_at: 'updated_at'
};

exports.Prisma.NotificationsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  title: 'title',
  body: 'body',
  type: 'type',
  related_id: 'related_id',
  read_at: 'read_at',
  created_at: 'created_at',
  data: 'data'
};

exports.Prisma.PaymentsScalarFieldEnum = {
  id: 'id',
  mission_id: 'mission_id',
  proposal_id: 'proposal_id',
  user_id: 'user_id',
  provider_id: 'provider_id',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  mp_preference_id: 'mp_preference_id',
  mp_payment_id: 'mp_payment_id',
  external_ref: 'external_ref',
  created_at: 'created_at',
  updated_at: 'updated_at',
  status_detail: 'status_detail',
  payment_method_id: 'payment_method_id',
  payer_email: 'payer_email',
  collector_id: 'collector_id',
  net_received: 'net_received',
  fee_amount: 'fee_amount',
  installments: 'installments',
  card_last_four: 'card_last_four',
  order_id: 'order_id',
  refund_status: 'refund_status',
  refund_amount: 'refund_amount',
  refunded_at: 'refunded_at',
  canceled_at: 'canceled_at',
  money_release_date: 'money_release_date'
};

exports.Prisma.ProfessionsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category_id: 'category_id',
  icon: 'icon',
  keywords: 'keywords',
  search_vector: 'search_vector',
  popularity_score: 'popularity_score',
  service_type: 'service_type'
};

exports.Prisma.ProposalsScalarFieldEnum = {
  id: 'id',
  mission_id: 'mission_id',
  user_id: 'user_id',
  price: 'price',
  deadline_days: 'deadline_days',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.Provider_mediaScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  kind: 'kind',
  s3_key: 's3_key',
  created_at: 'created_at'
};

exports.Prisma.Provider_penaltiesScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  request_id: 'request_id',
  reason: 'reason',
  applied_at: 'applied_at'
};

exports.Prisma.Provider_professionsScalarFieldEnum = {
  provider_user_id: 'provider_user_id',
  profession_id: 'profession_id',
  fixed_price: 'fixed_price',
  hourly_rate: 'hourly_rate'
};

exports.Prisma.ProvidersScalarFieldEnum = {
  user_id: 'user_id',
  bio: 'bio',
  address: 'address',
  rating_avg: 'rating_avg',
  rating_count: 'rating_count',
  wallet_balance: 'wallet_balance',
  latitude: 'latitude',
  longitude: 'longitude',
  is_online: 'is_online',
  document_type: 'document_type',
  document_value: 'document_value',
  commercial_name: 'commercial_name'
};

exports.Prisma.ReviewsScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  reviewer_id: 'reviewer_id',
  reviewee_id: 'reviewee_id',
  rating: 'rating',
  comment: 'comment',
  created_at: 'created_at'
};

exports.Prisma.Service_categoriesScalarFieldEnum = {
  id: 'id',
  name: 'name',
  icon_slug: 'icon_slug'
};

exports.Prisma.Service_conversationsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  provider_id: 'provider_id',
  request_id: 'request_id',
  created_at: 'created_at'
};

exports.Prisma.Service_edit_requestsScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  provider_id: 'provider_id',
  reason: 'reason',
  description: 'description',
  additional_value: 'additional_value',
  platform_fee: 'platform_fee',
  images_json: 'images_json',
  video_key: 'video_key',
  status: 'status',
  created_at: 'created_at',
  decided_at: 'decided_at'
};

exports.Prisma.Service_dispatchesScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  provider_list: 'provider_list',
  status: 'status',
  current_cycle: 'current_cycle',
  current_provider_index: 'current_provider_index',
  history: 'history',
  last_attempt_at: 'last_attempt_at',
  next_retry_at: 'next_retry_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Service_mediaScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  media_key: 'media_key',
  media_type: 'media_type',
  created_at: 'created_at'
};

exports.Prisma.Service_messagesScalarFieldEnum = {
  id: 'id',
  conversation_id: 'conversation_id',
  sender_id: 'sender_id',
  content: 'content',
  created_at: 'created_at'
};

exports.Prisma.Service_rejectionsScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  provider_id: 'provider_id',
  created_at: 'created_at'
};

exports.Prisma.Service_requestsScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  category_id: 'category_id',
  profession: 'profession',
  provider_id: 'provider_id',
  description: 'description',
  status: 'status',
  latitude: 'latitude',
  longitude: 'longitude',
  address: 'address',
  price_estimated: 'price_estimated',
  price_upfront: 'price_upfront',
  provider_amount: 'provider_amount',
  scheduled_at: 'scheduled_at',
  created_at: 'created_at',
  location_type: 'location_type',
  arrived_at: 'arrived_at',
  payment_remaining_status: 'payment_remaining_status',
  contest_reason: 'contest_reason',
  contest_status: 'contest_status',
  contest_evidence: 'contest_evidence',
  validation_code: 'validation_code',
  proof_photo: 'proof_photo',
  proof_video: 'proof_video',
  proof_code: 'proof_code',
  completion_code: 'completion_code',
  completion_requested_at: 'completion_requested_at',
  status_updated_at: 'status_updated_at',
  completed_at: 'completed_at'
};

exports.Prisma.Service_reviewsScalarFieldEnum = {
  id: 'id',
  request_id: 'request_id',
  client_id: 'client_id',
  provider_id: 'provider_id',
  rating: 'rating',
  comment: 'comment',
  created_at: 'created_at'
};

exports.Prisma.Service_tasksScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  name: 'name',
  quantity: 'quantity',
  unit_price: 'unit_price',
  subtotal: 'subtotal',
  created_at: 'created_at'
};

exports.Prisma.ServicesScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  provider_id: 'provider_id',
  category: 'category',
  description: 'description',
  status: 'status',
  created_at: 'created_at'
};

exports.Prisma.Task_catalogScalarFieldEnum = {
  id: 'id',
  profession_id: 'profession_id',
  name: 'name',
  pricing_type: 'pricing_type',
  unit_name: 'unit_name',
  unit_price: 'unit_price',
  keywords: 'keywords',
  active: 'active',
  created_at: 'created_at'
};

exports.Prisma.TransactionsScalarFieldEnum = {
  id: 'id',
  service_id: 'service_id',
  user_id: 'user_id',
  amount: 'amount',
  type: 'type',
  status: 'status',
  provider_ref: 'provider_ref',
  description: 'description',
  created_at: 'created_at'
};

exports.Prisma.User_devicesScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  token: 'token',
  platform: 'platform',
  last_active: 'last_active',
  created_at: 'created_at'
};

exports.Prisma.UsersScalarFieldEnum = {
  id: 'id',
  firebase_uid: 'firebase_uid',
  email: 'email',
  password_hash: 'password_hash',
  full_name: 'full_name',
  role: 'role',
  phone: 'phone',
  avatar_url: 'avatar_url',
  created_at: 'created_at',
  is_verified: 'is_verified',
  avatar_blob: 'avatar_blob',
  avatar_mime: 'avatar_mime',
  status: 'status'
};

exports.Prisma.Provider_schedule_exceptionsScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  date: 'date',
  start_time: 'start_time',
  end_time: 'end_time',
  reason: 'reason',
  created_at: 'created_at'
};

exports.Prisma.Provider_locationsScalarFieldEnum = {
  provider_id: 'provider_id',
  latitude: 'latitude',
  longitude: 'longitude',
  updated_at: 'updated_at'
};

exports.Prisma.Provider_schedulesScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  day_of_week: 'day_of_week',
  start_time: 'start_time',
  end_time: 'end_time',
  break_start: 'break_start',
  break_end: 'break_end',
  is_enabled: 'is_enabled',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Provider_custom_servicesScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  name: 'name',
  description: 'description',
  duration: 'duration',
  price: 'price',
  category: 'category',
  active: 'active',
  created_at: 'created_at'
};

exports.Prisma.Auth_otpScalarFieldEnum = {
  id: 'id',
  otp_hash: 'otp_hash',
  expires_at: 'expires_at',
  used: 'used',
  created_at: 'created_at'
};

exports.Prisma.AppointmentsScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  client_id: 'client_id',
  service_request_id: 'service_request_id',
  start_time: 'start_time',
  end_time: 'end_time',
  status: 'status',
  notes: 'notes',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Audit_logsScalarFieldEnum = {
  id: 'id',
  user_id: 'user_id',
  action: 'action',
  entity_type: 'entity_type',
  entity_id: 'entity_id',
  details: 'details',
  ip_address: 'ip_address',
  user_agent: 'user_agent',
  created_at: 'created_at'
};

exports.Prisma.Provider_schedule_configsScalarFieldEnum = {
  id: 'id',
  provider_id: 'provider_id',
  day_of_week: 'day_of_week',
  start_time: 'start_time',
  end_time: 'end_time',
  is_active: 'is_active',
  created_at: 'created_at',
  updated_at: 'updated_at',
  lunch_start: 'lunch_start',
  lunch_end: 'lunch_end',
  slot_duration: 'slot_duration'
};

exports.Prisma.System_settingsScalarFieldEnum = {
  key_name: 'key_name',
  value: 'value',
  description: 'description',
  updated_at: 'updated_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  ai_embeddings: 'ai_embeddings',
  ai_training_examples: 'ai_training_examples',
  auth_users: 'auth_users',
  categories: 'categories',
  chat_messages: 'chat_messages',
  conversations: 'conversations',
  locations: 'locations',
  messages: 'messages',
  mission_media: 'mission_media',
  missions: 'missions',
  notification_devices: 'notification_devices',
  notification_registry: 'notification_registry',
  notification_prefs: 'notification_prefs',
  notifications: 'notifications',
  payments: 'payments',
  professions: 'professions',
  proposals: 'proposals',
  provider_media: 'provider_media',
  provider_penalties: 'provider_penalties',
  provider_professions: 'provider_professions',
  providers: 'providers',
  reviews: 'reviews',
  service_categories: 'service_categories',
  service_conversations: 'service_conversations',
  service_edit_requests: 'service_edit_requests',
  service_dispatches: 'service_dispatches',
  service_media: 'service_media',
  service_messages: 'service_messages',
  service_rejections: 'service_rejections',
  service_requests: 'service_requests',
  service_reviews: 'service_reviews',
  service_tasks: 'service_tasks',
  services: 'services',
  task_catalog: 'task_catalog',
  transactions: 'transactions',
  user_devices: 'user_devices',
  users: 'users',
  provider_schedule_exceptions: 'provider_schedule_exceptions',
  provider_locations: 'provider_locations',
  provider_schedules: 'provider_schedules',
  provider_custom_services: 'provider_custom_services',
  auth_otp: 'auth_otp',
  appointments: 'appointments',
  audit_logs: 'audit_logs',
  provider_schedule_configs: 'provider_schedule_configs',
  system_settings: 'system_settings'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\thela\\.gemini\\antigravity\\scratch\\projeto_figma_app\\backend\\backend-worker\\generated\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "C:\\Users\\thela\\.gemini\\antigravity\\scratch\\projeto_figma_app\\backend\\backend-worker\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "sqlite",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n  output          = \"../generated/client\"\n  engineType      = \"wasm\"\n}\n\ndatasource db {\n  provider = \"sqlite\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel ai_embeddings {\n  id              Int       @id @default(autoincrement())\n  profession_id   Int\n  profession_name String?\n  category_id     Int?\n  category_name   String?\n  text            String?\n  embedding       String? // SQLite doesn't support Json/Vector natively in the same way, using String\n  created_at      DateTime? @default(now())\n}\n\nmodel ai_training_examples {\n  id            Int       @id @default(autoincrement())\n  profession_id Int\n  category_id   Int?\n  text          String\n  created_at    DateTime? @default(now())\n\n  @@index([category_id])\n  @@index([profession_id])\n}\n\nmodel auth_users {\n  id       Int    @id @default(autoincrement())\n  email    String @unique\n  password String\n  role     String // SQLite doesn't support enums\n}\n\nmodel categories {\n  id   Int     @id @default(autoincrement())\n  name String\n  icon String? @default(\"box\")\n  slug String?\n}\n\nmodel chat_messages {\n  id         BigInt    @id @default(autoincrement())\n  service_id String\n  sender_id  BigInt\n  content    String?\n  type       String?   @default(\"text\") // Enum -> String\n  sent_at    DateTime? @default(now())\n  read_at    DateTime?\n\n  service_requests service_requests @relation(fields: [service_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  users            users            @relation(fields: [sender_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n\n  @@index([sender_id])\n  @@index([service_id])\n}\n\nmodel conversations {\n  id          Int       @id @default(autoincrement())\n  client_id   Int\n  provider_id Int\n  request_id  Int?\n  created_at  DateTime? @default(now())\n\n  @@index([client_id, provider_id])\n  @@index([request_id])\n}\n\nmodel locations {\n  id         Int       @id @default(autoincrement())\n  service_id Int\n  lat        Float\n  lng        Float\n  created_at DateTime? @default(now())\n}\n\nmodel messages {\n  id                  Int       @id @default(autoincrement())\n  service_id          Int\n  sender              String // Enum -> String\n  text                String\n  created_at          DateTime? @default(now())\n  seen_by_user_at     DateTime?\n  seen_by_provider_at DateTime?\n}\n\nmodel mission_media {\n  id         Int       @id @default(autoincrement())\n  mission_id Int\n  user_id    Int\n  kind       String\n  s3_key     String\n  created_at DateTime? @default(now())\n\n  @@index([mission_id])\n}\n\nmodel missions {\n  id          Int       @id @default(autoincrement())\n  user_id     Int\n  title       String\n  description String?\n  location    String?\n  lat         Decimal?\n  lng         Decimal?\n  budget      Decimal?\n  status      String    @default(\"open\")\n  created_at  DateTime? @default(now())\n  provider_id Int?\n  category    String?\n\n  @@index([category])\n  @@index([created_at])\n  @@index([lat, lng])\n  @@index([status])\n}\n\nmodel notification_devices {\n  id           Int       @id @default(autoincrement())\n  user_id      Int\n  token        String\n  platform     String?\n  last_seen_at DateTime?\n\n  @@unique([user_id, token])\n  @@index([user_id])\n}\n\nmodel notification_registry {\n  user_id      BigInt    @id\n  fcm_token    String\n  professions  String?\n  latitude     Decimal?\n  longitude    Decimal?\n  is_online    Boolean   @default(false)\n  last_seen_at DateTime? @default(now())\n\n  users users @relation(fields: [user_id], references: [id], onDelete: Cascade)\n\n  @@index([is_online])\n  @@index([professions])\n}\n\nmodel notification_prefs {\n  user_id       Int       @id\n  allow_payment Int       @default(1)\n  allow_mission Int       @default(1)\n  allow_chat    Int       @default(1)\n  allow_general Int       @default(1)\n  updated_at    DateTime?\n}\n\nmodel notifications {\n  id         BigInt    @id @default(autoincrement())\n  user_id    BigInt\n  title      String\n  body       String?\n  type       String\n  related_id String?\n  read_at    DateTime?\n  created_at DateTime? @default(now())\n  data       String? // Json -> String\n  users      users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([user_id])\n}\n\nmodel payments {\n  id                 Int       @id @default(autoincrement())\n  mission_id         String\n  proposal_id        Int?\n  user_id            Int\n  provider_id        Int?\n  amount             Decimal\n  currency           String    @default(\"BRL\")\n  status             String    @default(\"pending\")\n  mp_preference_id   String?\n  mp_payment_id      String?\n  external_ref       String?\n  created_at         DateTime? @default(now())\n  updated_at         DateTime?\n  status_detail      String?\n  payment_method_id  String?\n  payer_email        String?\n  collector_id       String?\n  net_received       Decimal?\n  fee_amount         Decimal?\n  installments       Int?\n  card_last_four     String?\n  order_id           String?\n  refund_status      String?\n  refund_amount      Decimal?\n  refunded_at        DateTime?\n  canceled_at        DateTime?\n  money_release_date DateTime?\n\n  @@index([external_ref])\n  @@index([mission_id])\n  @@index([mp_payment_id])\n  @@index([status])\n}\n\nmodel professions {\n  id                   Int                    @id @default(autoincrement())\n  name                 String                 @unique\n  category_id          Int?\n  icon                 String?\n  keywords             String?\n  search_vector        String? // Json -> String\n  popularity_score     Int?                   @default(0)\n  service_type         String                 @default(\"on_site\") // Enum -> String\n  service_categories   service_categories?    @relation(fields: [category_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  task_catalog         task_catalog[]\n  provider_professions provider_professions[]\n}\n\nmodel proposals {\n  id            Int       @id @default(autoincrement())\n  mission_id    Int\n  user_id       Int\n  price         Decimal\n  deadline_days Int\n  status        String    @default(\"sent\")\n  created_at    DateTime? @default(now())\n}\n\nmodel provider_media {\n  id         Int       @id @default(autoincrement())\n  user_id    Int\n  kind       String\n  s3_key     String\n  created_at DateTime? @default(now())\n\n  @@index([user_id])\n}\n\nmodel provider_penalties {\n  id          Int       @id @default(autoincrement())\n  provider_id Int\n  request_id  Int\n  reason      String?\n  applied_at  DateTime? @default(now())\n}\n\nmodel provider_professions {\n  provider_user_id BigInt\n  profession_id    Int\n  fixed_price      Decimal?\n  hourly_rate      Decimal?\n  users            users       @relation(fields: [provider_user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  professions      professions @relation(fields: [profession_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@id([provider_user_id, profession_id])\n}\n\nmodel providers {\n  user_id          BigInt             @id\n  bio              String?\n  address          String?\n  rating_avg       Decimal?           @default(0.00)\n  rating_count     Int?               @default(0)\n  wallet_balance   Decimal?           @default(0.00)\n  latitude         Decimal?\n  longitude        Decimal?\n  is_online        Boolean?           @default(false)\n  document_type    String? // Enum -> String\n  document_value   String?\n  commercial_name  String?\n  users            users              @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  service_requests service_requests[]\n\n  @@index([document_value])\n}\n\nmodel reviews {\n  id                               Int              @id @default(autoincrement())\n  service_id                       String\n  reviewer_id                      BigInt\n  reviewee_id                      BigInt\n  rating                           Int\n  comment                          String?\n  created_at                       DateTime?        @default(now())\n  service_requests                 service_requests @relation(fields: [service_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  users_reviews_reviewer_idTousers users            @relation(\"reviews_reviewer_idTousers\", fields: [reviewer_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  users_reviews_reviewee_idTousers users            @relation(\"reviews_reviewee_idTousers\", fields: [reviewee_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([service_id, reviewer_id])\n  @@index([reviewee_id])\n  @@index([reviewer_id])\n}\n\nmodel service_categories {\n  id               Int                @id @default(autoincrement())\n  name             String             @unique\n  icon_slug        String?\n  service_requests service_requests[]\n  professions      professions[]\n}\n\nmodel service_conversations {\n  id          Int       @id @default(autoincrement())\n  client_id   Int\n  provider_id Int\n  request_id  Int?\n  created_at  DateTime? @default(now())\n\n  @@index([client_id, provider_id])\n  @@index([request_id])\n}\n\nmodel service_edit_requests {\n  id               BigInt           @id @default(autoincrement())\n  service_id       String\n  provider_id      BigInt\n  reason           String\n  description      String?\n  additional_value Decimal\n  platform_fee     Decimal\n  images_json      String?\n  video_key        String?\n  status           String?          @default(\"pending\") // Enum -> String\n  created_at       DateTime?        @default(now())\n  decided_at       DateTime?\n  service_requests service_requests @relation(fields: [service_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  users            users            @relation(fields: [provider_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n\n  @@index([provider_id])\n  @@index([service_id])\n}\n\nmodel service_dispatches {\n  id                     Int       @id @default(autoincrement())\n  service_id             String\n  provider_list          String // Json -> String\n  status                 String    @default(\"active\")\n  current_cycle          Int       @default(1)\n  current_provider_index Int       @default(0)\n  history                String? // Json -> String\n  last_attempt_at        DateTime?\n  next_retry_at          DateTime?\n  created_at             DateTime? @default(now())\n  updated_at             DateTime? @updatedAt\n\n  @@index([status])\n  @@index([service_id])\n}\n\nmodel service_media {\n  id               BigInt           @id @default(autoincrement())\n  service_id       String\n  media_key        String\n  media_type       String // Enum -> String\n  created_at       DateTime?        @default(now())\n  service_requests service_requests @relation(fields: [service_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([service_id])\n}\n\nmodel service_messages {\n  id              Int       @id @default(autoincrement())\n  conversation_id Int\n  sender_id       Int\n  content         String\n  created_at      DateTime? @default(now())\n\n  @@index([conversation_id])\n}\n\nmodel service_rejections {\n  id          Int       @id @default(autoincrement())\n  service_id  String\n  provider_id Int\n  created_at  DateTime? @default(now())\n\n  @@unique([service_id, provider_id])\n}\n\nmodel service_requests {\n  id                       String                  @id\n  client_id                BigInt\n  category_id              Int\n  profession               String?\n  provider_id              BigInt?\n  description              String?\n  status                   String                  @default(\"waiting_payment\") // Enum -> String\n  latitude                 Decimal?\n  longitude                Decimal?\n  address                  String?\n  price_estimated          Decimal?\n  price_upfront            Decimal?\n  provider_amount          Decimal?\n  scheduled_at             DateTime?\n  created_at               DateTime?               @default(now())\n  location_type            String?                 @default(\"client\") // Enum -> String\n  arrived_at               DateTime?\n  payment_remaining_status String?                 @default(\"pending\") // Enum -> String\n  contest_reason           String?\n  contest_status           String?                 @default(\"none\") // Enum -> String\n  contest_evidence         String? // Json -> String\n  validation_code          String?\n  proof_photo              String?\n  proof_video              String?\n  proof_code               String?\n  completion_code          String?\n  completion_requested_at  DateTime?\n  status_updated_at        DateTime?               @default(now())\n  completed_at             DateTime?\n  appointments             appointments[]\n  chat_messages            chat_messages[]\n  reviews                  reviews[]\n  service_edit_requests    service_edit_requests[]\n  service_media            service_media[]\n  users                    users                   @relation(fields: [client_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  service_categories       service_categories      @relation(fields: [category_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  providers                providers?              @relation(fields: [provider_id], references: [user_id], onDelete: NoAction, onUpdate: NoAction)\n  service_tasks            service_tasks[]\n  transactions             transactions[]\n\n  @@index([category_id])\n  @@index([client_id])\n  @@index([provider_id])\n}\n\nmodel service_reviews {\n  id          Int       @id @default(autoincrement())\n  request_id  Int\n  client_id   Int\n  provider_id Int\n  rating      Int\n  comment     String?\n  created_at  DateTime? @default(now())\n\n  @@index([provider_id])\n  @@index([request_id])\n}\n\nmodel service_tasks {\n  id               BigInt           @id @default(autoincrement())\n  service_id       String\n  name             String\n  quantity         Decimal          @default(1.00)\n  unit_price       Decimal\n  subtotal         Decimal\n  created_at       DateTime?        @default(now())\n  service_requests service_requests @relation(fields: [service_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([service_id])\n}\n\nmodel services {\n  id          Int       @id @default(autoincrement())\n  client_id   Int\n  provider_id Int?\n  category    String\n  description String?\n  status      String\n  created_at  DateTime? @default(now())\n}\n\nmodel task_catalog {\n  id            Int         @id @default(autoincrement())\n  profession_id Int\n  name          String\n  pricing_type  String      @default(\"fixed\") // Enum -> String\n  unit_name     String?\n  unit_price    Decimal\n  keywords      String?\n  active        Boolean?    @default(true)\n  created_at    DateTime?   @default(now())\n  professions   professions @relation(fields: [profession_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n\n  @@index([profession_id])\n}\n\nmodel transactions {\n  id               BigInt           @id @default(autoincrement())\n  service_id       String\n  user_id          BigInt\n  amount           Decimal\n  type             String // Enum -> String\n  status           String?          @default(\"pending\") // Enum -> String\n  provider_ref     String?\n  description      String?\n  created_at       DateTime?        @default(now())\n  service_requests service_requests @relation(fields: [service_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n  users            users            @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)\n\n  @@index([service_id])\n  @@index([user_id])\n}\n\nmodel user_devices {\n  id          BigInt    @id @default(autoincrement())\n  user_id     BigInt\n  token       String\n  platform    String    @default(\"web\") // Enum -> String\n  last_active DateTime? @default(now())\n  created_at  DateTime? @default(now())\n  users       users     @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([user_id, token])\n}\n\nmodel users {\n  id                                           BigInt                         @id @default(autoincrement())\n  firebase_uid                                 String?                        @unique\n  email                                        String                         @unique\n  password_hash                                String\n  full_name                                    String\n  role                                         String                         @default(\"client\") // Enum -> String\n  phone                                        String?\n  avatar_url                                   String?\n  created_at                                   DateTime?                      @default(now())\n  is_verified                                  Boolean?                       @default(false)\n  avatar_blob                                  Bytes?\n  avatar_mime                                  String?\n  status                                       String?                        @default(\"active\")\n  appointments_appointments_client_idTousers   appointments[]                 @relation(\"appointments_client_idTousers\")\n  appointments_appointments_provider_idTousers appointments[]                 @relation(\"appointments_provider_idTousers\")\n  chat_messages                                chat_messages[]\n  notifications                                notifications[]\n  provider_custom_services                     provider_custom_services[]\n  provider_schedule_configs                    provider_schedule_configs[]\n  provider_schedule_exceptions                 provider_schedule_exceptions[]\n  provider_schedules                           provider_schedules[]\n  providers                                    providers?\n  reviews_reviews_reviewer_idTousers           reviews[]                      @relation(\"reviews_reviewer_idTousers\")\n  reviews_reviews_reviewee_idTousers           reviews[]                      @relation(\"reviews_reviewee_idTousers\")\n  service_edit_requests                        service_edit_requests[]\n  service_requests                             service_requests[]\n  transactions                                 transactions[]\n  user_devices                                 user_devices[]\n  provider_professions                         provider_professions[]\n  provider_locations                           provider_locations?\n  notification_registry                        notification_registry?\n\n  @@index([firebase_uid])\n}\n\nmodel provider_schedule_exceptions {\n  id          Int       @id @default(autoincrement())\n  provider_id BigInt\n  date        DateTime\n  start_time  String?\n  end_time    String?\n  reason      String?\n  created_at  DateTime? @default(now())\n  users       users     @relation(fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([provider_id, date])\n  @@index([provider_id])\n}\n\nmodel provider_locations {\n  provider_id BigInt    @id\n  latitude    Decimal\n  longitude   Decimal\n  updated_at  DateTime? @default(now())\n  users       users     @relation(fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([latitude, longitude])\n}\n\nmodel provider_schedules {\n  id          Int       @id @default(autoincrement())\n  provider_id BigInt\n  day_of_week Int\n  start_time  String\n  end_time    String\n  break_start String?\n  break_end   String?\n  is_enabled  Boolean   @default(true)\n  created_at  DateTime? @default(now())\n  updated_at  DateTime?\n  users       users     @relation(fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([provider_id])\n}\n\nmodel provider_custom_services {\n  id          Int       @id @default(autoincrement())\n  provider_id BigInt\n  name        String\n  description String?\n  duration    Int\n  price       Decimal\n  category    String?\n  active      Boolean   @default(true)\n  created_at  DateTime? @default(now())\n  users       users     @relation(fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@index([provider_id])\n}\n\nmodel auth_otp {\n  id         Int       @id @default(autoincrement())\n  otp_hash   String\n  expires_at DateTime\n  used       Int?      @default(0)\n  created_at DateTime? @default(now())\n\n  @@map(\"_auth_otp\")\n}\n\nmodel appointments {\n  id                                    BigInt            @id @default(autoincrement())\n  provider_id                           BigInt\n  client_id                             BigInt?\n  service_request_id                    String?\n  start_time                            DateTime\n  end_time                              DateTime\n  status                                String            @default(\"scheduled\") // Enum -> String\n  notes                                 String?\n  created_at                            DateTime?         @default(now())\n  updated_at                            DateTime?         @default(now())\n  users_appointments_client_idTousers   users?            @relation(\"appointments_client_idTousers\", fields: [client_id], references: [id], onUpdate: NoAction)\n  users_appointments_provider_idTousers users             @relation(\"appointments_provider_idTousers\", fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n  service_requests                      service_requests? @relation(fields: [service_request_id], references: [id], onUpdate: NoAction)\n\n  @@index([client_id])\n  @@index([service_request_id])\n  @@index([provider_id, start_time])\n}\n\nmodel audit_logs {\n  id          BigInt    @id @default(autoincrement())\n  user_id     BigInt?\n  action      String\n  entity_type String?\n  entity_id   String?\n  details     String?\n  ip_address  String?\n  user_agent  String?\n  created_at  DateTime? @default(now())\n\n  @@index([action])\n  @@index([created_at])\n  @@index([user_id])\n}\n\nmodel provider_schedule_configs {\n  id            Int       @id @default(autoincrement())\n  provider_id   BigInt\n  day_of_week   Int\n  start_time    DateTime\n  end_time      DateTime\n  is_active     Boolean?  @default(true)\n  created_at    DateTime? @default(now())\n  updated_at    DateTime? @default(now())\n  lunch_start   DateTime?\n  lunch_end     DateTime?\n  slot_duration Int?      @default(30)\n  users         users     @relation(fields: [provider_id], references: [id], onDelete: Cascade, onUpdate: NoAction)\n\n  @@unique([provider_id, day_of_week])\n}\n\nmodel system_settings {\n  key_name    String    @id\n  value       String? // Json -> String\n  description String?\n  updated_at  DateTime? @default(now())\n}\n",
  "inlineSchemaHash": "cd2f3d386bede1727f972209bf37d080cad03819051bb87c94ca57923914839b",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"ai_embeddings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"profession_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"profession_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"category_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"text\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"embedding\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"ai_training_examples\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"profession_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"category_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"text\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"auth_users\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"categories\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"chat_messages\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sender_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sent_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"read_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"chat_messagesToservice_requests\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"chat_messagesTousers\"}],\"dbName\":null},\"conversations\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"request_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"locations\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"lat\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"lng\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"messages\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"sender\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"text\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"seen_by_user_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"seen_by_provider_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"mission_media\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"mission_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"kind\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"s3_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"missions\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lat\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"lng\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"budget\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"notification_devices\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_seen_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"notification_registry\":{\"fields\":[{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"fcm_token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"professions\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"latitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"longitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"is_online\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"last_seen_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"notification_registryTousers\"}],\"dbName\":null},\"notification_prefs\":{\"fields\":[{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"allow_payment\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"allow_mission\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"allow_chat\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"allow_general\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"notifications\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"body\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"related_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"read_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"data\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"notificationsTousers\"}],\"dbName\":null},\"payments\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"mission_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proposal_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mp_preference_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mp_payment_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"external_ref\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status_detail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"payment_method_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"payer_email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"collector_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"net_received\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"fee_amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"installments\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"card_last_four\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"order_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"refund_status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"refund_amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"refunded_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"canceled_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"money_release_date\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"professions\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"icon\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"keywords\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"search_vector\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"popularity_score\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"service_categories\",\"kind\":\"object\",\"type\":\"service_categories\",\"relationName\":\"professionsToservice_categories\"},{\"name\":\"task_catalog\",\"kind\":\"object\",\"type\":\"task_catalog\",\"relationName\":\"professionsTotask_catalog\"},{\"name\":\"provider_professions\",\"kind\":\"object\",\"type\":\"provider_professions\",\"relationName\":\"professionsToprovider_professions\"}],\"dbName\":null},\"proposals\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"mission_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"deadline_days\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"provider_media\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"kind\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"s3_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"provider_penalties\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"request_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"applied_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"provider_professions\":{\"fields\":[{\"name\":\"provider_user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"profession_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"fixed_price\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"hourly_rate\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_professionsTousers\"},{\"name\":\"professions\",\"kind\":\"object\",\"type\":\"professions\",\"relationName\":\"professionsToprovider_professions\"}],\"dbName\":null},\"providers\":{\"fields\":[{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"bio\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rating_avg\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"rating_count\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"wallet_balance\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"latitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"longitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"is_online\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"document_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"document_value\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"commercial_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"providersTousers\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"providersToservice_requests\"}],\"dbName\":null},\"reviews\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reviewer_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"reviewee_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"comment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"reviewsToservice_requests\"},{\"name\":\"users_reviews_reviewer_idTousers\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"reviews_reviewer_idTousers\"},{\"name\":\"users_reviews_reviewee_idTousers\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"reviews_reviewee_idTousers\"}],\"dbName\":null},\"service_categories\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon_slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_categoriesToservice_requests\"},{\"name\":\"professions\",\"kind\":\"object\",\"type\":\"professions\",\"relationName\":\"professionsToservice_categories\"}],\"dbName\":null},\"service_conversations\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"request_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"service_edit_requests\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"additional_value\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"platform_fee\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"images_json\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"video_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"decided_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_edit_requestsToservice_requests\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"service_edit_requestsTousers\"}],\"dbName\":null},\"service_dispatches\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_list\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"current_cycle\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"current_provider_index\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"history\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_attempt_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"next_retry_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"service_media\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"media_key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"media_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_mediaToservice_requests\"}],\"dbName\":null},\"service_messages\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"conversation_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"sender_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"service_rejections\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"service_requests\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"category_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"profession\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"latitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"longitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price_estimated\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"price_upfront\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"provider_amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"scheduled_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"location_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"arrived_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"payment_remaining_status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contest_reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contest_status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contest_evidence\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"validation_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proof_photo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proof_video\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"proof_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"completion_code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"completion_requested_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status_updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completed_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"appointments\",\"kind\":\"object\",\"type\":\"appointments\",\"relationName\":\"appointmentsToservice_requests\"},{\"name\":\"chat_messages\",\"kind\":\"object\",\"type\":\"chat_messages\",\"relationName\":\"chat_messagesToservice_requests\"},{\"name\":\"reviews\",\"kind\":\"object\",\"type\":\"reviews\",\"relationName\":\"reviewsToservice_requests\"},{\"name\":\"service_edit_requests\",\"kind\":\"object\",\"type\":\"service_edit_requests\",\"relationName\":\"service_edit_requestsToservice_requests\"},{\"name\":\"service_media\",\"kind\":\"object\",\"type\":\"service_media\",\"relationName\":\"service_mediaToservice_requests\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"service_requestsTousers\"},{\"name\":\"service_categories\",\"kind\":\"object\",\"type\":\"service_categories\",\"relationName\":\"service_categoriesToservice_requests\"},{\"name\":\"providers\",\"kind\":\"object\",\"type\":\"providers\",\"relationName\":\"providersToservice_requests\"},{\"name\":\"service_tasks\",\"kind\":\"object\",\"type\":\"service_tasks\",\"relationName\":\"service_requestsToservice_tasks\"},{\"name\":\"transactions\",\"kind\":\"object\",\"type\":\"transactions\",\"relationName\":\"service_requestsTotransactions\"}],\"dbName\":null},\"service_reviews\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"request_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"comment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"service_tasks\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"unit_price\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"subtotal\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_requestsToservice_tasks\"}],\"dbName\":null},\"services\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"task_catalog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"profession_id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pricing_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unit_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unit_price\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"keywords\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"active\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"professions\",\"kind\":\"object\",\"type\":\"professions\",\"relationName\":\"professionsTotask_catalog\"}],\"dbName\":null},\"transactions\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider_ref\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_requestsTotransactions\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"transactionsTousers\"}],\"dbName\":null},\"user_devices\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"last_active\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"user_devicesTousers\"}],\"dbName\":null},\"users\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"firebase_uid\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password_hash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"full_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatar_url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"is_verified\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"avatar_blob\",\"kind\":\"scalar\",\"type\":\"Bytes\"},{\"name\":\"avatar_mime\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"appointments_appointments_client_idTousers\",\"kind\":\"object\",\"type\":\"appointments\",\"relationName\":\"appointments_client_idTousers\"},{\"name\":\"appointments_appointments_provider_idTousers\",\"kind\":\"object\",\"type\":\"appointments\",\"relationName\":\"appointments_provider_idTousers\"},{\"name\":\"chat_messages\",\"kind\":\"object\",\"type\":\"chat_messages\",\"relationName\":\"chat_messagesTousers\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"notifications\",\"relationName\":\"notificationsTousers\"},{\"name\":\"provider_custom_services\",\"kind\":\"object\",\"type\":\"provider_custom_services\",\"relationName\":\"provider_custom_servicesTousers\"},{\"name\":\"provider_schedule_configs\",\"kind\":\"object\",\"type\":\"provider_schedule_configs\",\"relationName\":\"provider_schedule_configsTousers\"},{\"name\":\"provider_schedule_exceptions\",\"kind\":\"object\",\"type\":\"provider_schedule_exceptions\",\"relationName\":\"provider_schedule_exceptionsTousers\"},{\"name\":\"provider_schedules\",\"kind\":\"object\",\"type\":\"provider_schedules\",\"relationName\":\"provider_schedulesTousers\"},{\"name\":\"providers\",\"kind\":\"object\",\"type\":\"providers\",\"relationName\":\"providersTousers\"},{\"name\":\"reviews_reviews_reviewer_idTousers\",\"kind\":\"object\",\"type\":\"reviews\",\"relationName\":\"reviews_reviewer_idTousers\"},{\"name\":\"reviews_reviews_reviewee_idTousers\",\"kind\":\"object\",\"type\":\"reviews\",\"relationName\":\"reviews_reviewee_idTousers\"},{\"name\":\"service_edit_requests\",\"kind\":\"object\",\"type\":\"service_edit_requests\",\"relationName\":\"service_edit_requestsTousers\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"service_requestsTousers\"},{\"name\":\"transactions\",\"kind\":\"object\",\"type\":\"transactions\",\"relationName\":\"transactionsTousers\"},{\"name\":\"user_devices\",\"kind\":\"object\",\"type\":\"user_devices\",\"relationName\":\"user_devicesTousers\"},{\"name\":\"provider_professions\",\"kind\":\"object\",\"type\":\"provider_professions\",\"relationName\":\"provider_professionsTousers\"},{\"name\":\"provider_locations\",\"kind\":\"object\",\"type\":\"provider_locations\",\"relationName\":\"provider_locationsTousers\"},{\"name\":\"notification_registry\",\"kind\":\"object\",\"type\":\"notification_registry\",\"relationName\":\"notification_registryTousers\"}],\"dbName\":null},\"provider_schedule_exceptions\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"start_time\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"end_time\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_schedule_exceptionsTousers\"}],\"dbName\":null},\"provider_locations\":{\"fields\":[{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"latitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"longitude\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_locationsTousers\"}],\"dbName\":null},\"provider_schedules\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"day_of_week\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"start_time\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"end_time\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"break_start\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"break_end\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"is_enabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_schedulesTousers\"}],\"dbName\":null},\"provider_custom_services\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"duration\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Decimal\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"active\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_custom_servicesTousers\"}],\"dbName\":null},\"auth_otp\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"otp_hash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expires_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"used\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"_auth_otp\"},\"appointments\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"client_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"service_request_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"start_time\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"end_time\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users_appointments_client_idTousers\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"appointments_client_idTousers\"},{\"name\":\"users_appointments_provider_idTousers\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"appointments_provider_idTousers\"},{\"name\":\"service_requests\",\"kind\":\"object\",\"type\":\"service_requests\",\"relationName\":\"appointmentsToservice_requests\"}],\"dbName\":null},\"audit_logs\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"user_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entity_type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entity_id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"details\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ip_address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user_agent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"provider_schedule_configs\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"provider_id\",\"kind\":\"scalar\",\"type\":\"BigInt\"},{\"name\":\"day_of_week\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"start_time\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"end_time\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"is_active\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"created_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lunch_start\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lunch_end\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"slot_duration\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"users\",\"relationName\":\"provider_schedule_configsTousers\"}],\"dbName\":null},\"system_settings\":{\"fields\":[{\"name\":\"key_name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"value\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updated_at\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

