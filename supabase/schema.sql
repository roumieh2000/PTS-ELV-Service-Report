-- ============================================================
-- ELV Service Reports - Supabase schema setup
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- REPORTS TABLE ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  doc_ref text not null unique,
  lpo_contract_ref text not null default '',
  date text not null,
  txn text not null default '',
  client_name text not null,
  project_name text not null,
  job_types text[] not null default '{}',
  complaints text not null default '',
  actions_taken text not null default '',
  resolution_status text not null default 'Pending',
  prog_tech_name text not null default '',
  prog_tech_date text not null default '',
  prog_tech_signature text,
  client_sign_name text not null default '',
  client_sign_date text not null default '',
  client_signature text,
  documents jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- USERS TABLE ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  role text not null default 'staff',
  name text not null default '',
  client_name text,
  permissions text[],
  created_at timestamptz not null default now()
);

-- ---------- ROW LEVEL SECURITY ----------
-- NOTE: The app uses the anon key directly without Supabase Auth login.
-- For simplicity these policies allow full anon access. For production
-- security, replace with authenticated policies and real auth.
alter table public.reports enable row level security;
alter table public.users enable row level security;

drop policy if exists "anon reports select" on public.reports;
create policy "anon reports select" on public.reports
  for select using (true);
drop policy if exists "anon reports insert" on public.reports;
create policy "anon reports insert" on public.reports
  for insert with check (true);
drop policy if exists "anon reports update" on public.reports;
create policy "anon reports update" on public.reports
  for update using (true) with check (true);
drop policy if exists "anon reports delete" on public.reports;
create policy "anon reports delete" on public.reports
  for delete using (true);

drop policy if exists "anon users select" on public.users;
create policy "anon users select" on public.users
  for select using (true);
drop policy if exists "anon users insert" on public.users;
create policy "anon users insert" on public.users
  for insert with check (true);
drop policy if exists "anon users update" on public.users;
create policy "anon users update" on public.users
  for update using (true) with check (true);
drop policy if exists "anon users delete" on public.users;
create policy "anon users delete" on public.users
  for delete using (true);

-- ---------- SEED USERS (bootstrap) ----------
insert into public.users (username, password, role, name, client_name, permissions)
values
  ('admin', 'admin123', 'admin', 'Admin User', null,
   array['reports:read','reports:create','reports:edit','reports:delete','reports:export','reports:sign','console:access','console:write','users:manage']),
  ('staff', 'staff123', 'staff', 'Staff User', null,
   array['reports:read','reports:create','reports:edit','reports:export','reports:sign','console:access','console:write']),
  ('customer', 'customer123', 'customer', 'Ahmed Al Mansouri', 'Dubai Tech Solutions',
   array['reports:read','reports:export','reports:sign'])
on conflict (username) do nothing;

-- ---------- SEED REPORTS ----------
insert into public.reports
  (doc_ref, lpo_contract_ref, date, txn, client_name, project_name, job_types,
   complaints, actions_taken, resolution_status,
   prog_tech_name, prog_tech_date, client_sign_name, client_sign_date,
   documents)
values
  ('SR-2026-001', 'LPO-2026-0042', '2026-04-15', 'TXN-8891', 'Dubai Tech Solutions',
   'Smart Office BMS Integration', array['Project','Completion'],
   'BMS gateway not communicating with HVAC controllers. Intermittent packet loss observed on Modbus RTU loop.',
   'Replaced faulty BMS gateway module. Re-terminated Modbus RTU wiring at panel DB-03. Full system reboot and loop test performed. All 12 HVAC controllers responding within expected latency.',
   'Resolved', 'Ahmed Al Mansouri', '2026-04-15', 'John Smith', '2026-04-15',
   '{"passwordRecords":true,"deliveryNotes":true,"configuration":true,"rentMaterial":false,"others":false}'),
  ('SR-2026-002', 'LPO-2026-0098', '2026-04-22', 'TXN-9023', 'Al Ghurair Properties',
   'Residential Tower ELV Systems', array['Service Calls'],
   'Fire alarm panel FA-02 showing ground fault on loop B. Tenants reporting intermittent false alarms in zones 14-18.',
   'Traced ground fault to water-damaged detector head in zone 16 riser room. Replaced detector head and sealed conduit entry. Performed loop resistance test (1.2MOhm, within spec). Reset panel and monitored for 2 hours — no further faults.',
   'Resolved', 'Khalid Hassan', '2026-04-22', 'Rashid Al Ghurair', '2026-04-22',
   '{"passwordRecords":false,"deliveryNotes":true,"configuration":false,"rentMaterial":false,"others":true}'),
  ('SR-2026-003', 'LPO-2026-0155', '2026-05-02', 'TXN-9156', 'Sharjah National Oil Co',
   'Warehouse Security Upgrade', array['AMC','Service Calls'],
   'CCTV NVR unit SN-NVR-03 not recording on channels 9-16. Access control reader at Gate B failing card swipes intermittently.',
   'Replaced faulty SATA cable on NVR-03 and reformatted RAID array — channels 9-16 now recording. Updated firmware on Gate B reader (FW v4.21→v4.28). Replaced reader cable assembly. Awaiting replacement reader head under warranty from supplier.',
   'Pending', 'Saeed Al Ameri', '2026-05-02', 'Mohammed Al Ketbi', '2026-05-02',
   '{"passwordRecords":true,"deliveryNotes":true,"configuration":true,"rentMaterial":true,"others":false}')
on conflict (doc_ref) do nothing;

-- ============================================================
-- DAILY VISITS (added later — safe to run on existing installs)
-- ============================================================
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visit_date text not null,
  visit_time text not null,
  client_name text not null,
  person_in_charge text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.visits enable row level security;

drop policy if exists "anon visits select" on public.visits;
create policy "anon visits select" on public.visits
  for select using (true);
drop policy if exists "anon visits insert" on public.visits;
create policy "anon visits insert" on public.visits
  for insert with check (true);
drop policy if exists "anon visits update" on public.visits;
create policy "anon visits update" on public.visits
  for update using (true) with check (true);
drop policy if exists "anon visits delete" on public.visits;
create policy "anon visits delete" on public.visits
  for delete using (true);

-- Grant the new visits:access permission to existing admin/staff users
update public.users
set permissions = (select array_agg(distinct p) from unnest(permissions || array['visits:access']) as p)
where role in ('admin','staff')
  and not permissions @> array['visits:access'];

-- ============================================================
-- PROJECT CODES (added later — safe to run on existing installs)
-- Format: City-Number_Client\Project, e.g. AJM-032_DesignConsultants\K1-DVR
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  number text not null,
  client_ref text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "anon projects select" on public.projects;
create policy "anon projects select" on public.projects
  for select using (true);
drop policy if exists "anon projects insert" on public.projects;
create policy "anon projects insert" on public.projects
  for insert with check (true);
drop policy if exists "anon projects update" on public.projects;
create policy "anon projects update" on public.projects
  for update using (true) with check (true);
drop policy if exists "anon projects delete" on public.projects;
create policy "anon projects delete" on public.projects
  for delete using (true);

-- Grant the new projects:manage permission to admin users
update public.users
set permissions = (select array_agg(distinct p) from unnest(permissions || array['projects:manage']) as p)
where role = 'admin'
  and not permissions @> array['projects:manage'];

-- ---------- VISITS: optional project code ----------
alter table public.visits add column if not exists project_code text;
