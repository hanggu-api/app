$env:DATABASE_URL = "postgresql://postgres.hctrzaunbiokiecizkgi:Monica100%40irisMAR100%40@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL = "postgresql://postgres.hctrzaunbiokiecizkgi:Monica100%40irisMAR100%40@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

gcloud run deploy conserta-api `
    --source . `
    --region=us-central1 `
    --allow-unauthenticated `
    --set-env-vars="DATABASE_URL=$env:DATABASE_URL,DIRECT_URL=$env:DIRECT_URL,JWT_SECRET=super_secure_random_secrett_key_12345,FIREBASE_PROJECT_ID=cardapyia-service-2025,ENABLE_FAKE_PIX=true,MP_ACCESS_TOKEN=APP_USR-5920955064244671-122309-86c7c2f4c4172856415a8f98de468bb6-82191608,MP_PUBLIC_KEY=APP_USR-146c3bc4-631d-44cb-aec3-81cc7b6026d9,MP_WEBHOOK_SECRET=a61afccceaf0cba68f28e569e1598d83a926b700a415f00e18fc5a5d880a3215,GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json,SUPABASE_URL=https://hctrzaunbiokiecizkgi.supabase.co,SUPABASE_KEY=sb_publishable_4Zp59Y5Okzkp1_2TIipblQ_MU7Sv3T6"
