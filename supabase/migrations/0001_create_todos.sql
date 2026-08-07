create table if not exists todos (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  completed  boolean     not null default false,
  priority   text        not null default 'medium'
                         check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);
