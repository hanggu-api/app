-- Limpeza de tabelas legadas sem uso no runtime atual (app + edge functions)
-- Backup local em schema legacy_backup antes de remover.

begin;

create schema if not exists legacy_backup;

-- 1) app_config (substituída por app_configs)
create table if not exists legacy_backup.app_config as
select * from public.app_config;
drop table if exists public.app_config cascade;

-- 2) categories (não usada pelo app atual; catálogo canônico em task_catalog/service_categories)
create table if not exists legacy_backup.categories as
select * from public.categories;
drop table if exists public.categories cascade;

-- 3) service_tasks (legado)
create table if not exists legacy_backup.service_tasks as
select * from public.service_tasks;
drop table if exists public.service_tasks cascade;

-- 4) service_media (legado de metadados; storage bucket service_media permanece)
create table if not exists legacy_backup.service_media as
select * from public.service_media;
drop table if exists public.service_media cascade;

-- 5) notification_registry (legado)
create table if not exists legacy_backup.notification_registry as
select * from public.notification_registry;
drop table if exists public.notification_registry cascade;

-- 6) transactions (legado; fluxo financeiro atual usa payments/wallet_transactions)
create table if not exists legacy_backup.transactions as
select * from public.transactions;
drop table if exists public.transactions cascade;

-- 7) user_devices (legado)
create table if not exists legacy_backup.user_devices as
select * from public.user_devices;
drop table if exists public.user_devices cascade;

commit;
