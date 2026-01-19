
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
