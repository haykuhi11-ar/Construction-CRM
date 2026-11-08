-- ============================================================================
-- Construction CRM — Initial Database Migration
-- Supabase + PostgreSQL
--
-- Roles: manager, executor
--
-- Task statuses:
-- new, in_progress, under_review, accepted, revision
--
-- Architecture:
--   One tasks table.
--   assignee_id IS NULL = Global Tasks.
--   manager_id = manager responsible for the assignment.
--
-- Security:
--   Supabase Auth UID identifies the authenticated user.
--   RLS controls row visibility.
--   RPC functions control sensitive operations.
--   Managers see all tasks but can modify/review only their own.
--   Executors see only their assigned tasks.
--   History is append-only.
-- ============================================================================

begin;

-- ============================================================================
-- 1. SCHEMA AND ENUMS
-- ============================================================================

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.user_role as enum (
    'manager',
    'executor'
);

create type public.task_status as enum (
    'new',
    'in_progress',
    'under_review',
    'accepted',
    'revision'
);

-- ============================================================================
-- 2. PROFILES
-- ============================================================================

create table public.profiles (
    id uuid primary key
        references auth.users(id) on delete restrict,

    full_name text not null,

    role public.user_role not null default 'executor',

    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint profiles_full_name_check
        check (length(btrim(full_name)) between 1 and 200)
);

-- ============================================================================
-- 3. OBJECTS
-- ============================================================================

create table public.objects (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    address text not null,

    created_by uuid not null default auth.uid()
        references public.profiles(id) on delete restrict,

    is_archived boolean not null default false,

    archived_at timestamptz,

    archived_by uuid
        references public.profiles(id) on delete restrict,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint objects_name_check
        check (length(btrim(name)) between 1 and 200),

    constraint objects_address_check
        check (length(btrim(address)) between 1 and 500),

    constraint archived_object_consistency
        check (
            (
                not is_archived
                and archived_at is null
                and archived_by is null
            )
            or
            (
                is_archived
                and archived_at is not null
                and archived_by is not null
            )
        )
);

-- ============================================================================
-- 4. TASKS
-- ============================================================================

create table public.tasks (
    id uuid primary key default gen_random_uuid(),

    title text not null,

    description text,

    object_id uuid not null
        references public.objects(id) on delete restrict,

    -- NULL means the task is in Global Tasks.
    assignee_id uuid
        references public.profiles(id) on delete restrict,

    -- NULL means the task has not yet been assigned by a manager.
    manager_id uuid
        references public.profiles(id) on delete restrict,

    -- Original task creator. Never changes.
    created_by uuid not null default auth.uid()
        references public.profiles(id) on delete restrict,

    status public.task_status not null default 'new',

    deleted_at timestamptz,

    deleted_by uuid
        references public.profiles(id) on delete restrict,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint tasks_title_check
        check (length(btrim(title)) between 1 and 200),

    constraint tasks_description_check
        check (
            description is null
            or length(description) <= 5000
        ),

    constraint tasks_assignment_consistency
        check (
            (assignee_id is null and manager_id is null)
            or
            (assignee_id is not null and manager_id is not null)
        ),

    constraint deleted_task_consistency
        check (
            (deleted_at is null and deleted_by is null)
            or
            (deleted_at is not null and deleted_by is not null)
        )
);

-- ============================================================================
-- 5. TASK STATUS HISTORY
-- ============================================================================

create table public.task_history (
    id uuid primary key default gen_random_uuid(),

    task_id uuid not null
        references public.tasks(id) on delete restrict,

    changed_by uuid not null
        references public.profiles(id) on delete restrict,

    old_status public.task_status,

    new_status public.task_status not null,

    comment text,

    created_at timestamptz not null default now(),

    constraint status_actually_changed
        check (
            old_status is null
            or old_status <> new_status
        ),

    constraint task_history_comment_limit
        check (
            comment is null
            or length(comment) <= 1000
        ),

    constraint revision_requires_comment
        check (
            new_status <> 'revision'
            or nullif(btrim(comment), '') is not null
        )
);

-- ============================================================================
-- 6. TASK ASSIGNMENT HISTORY
-- ============================================================================

create table public.task_assignment_history (
    id uuid primary key default gen_random_uuid(),

    task_id uuid not null
        references public.tasks(id) on delete restrict,

    previous_assignee_id uuid
        references public.profiles(id) on delete restrict,

    -- NULL means the task was returned to Global Tasks.
    new_assignee_id uuid
        references public.profiles(id) on delete restrict,

    changed_by uuid not null
        references public.profiles(id) on delete restrict,

    created_at timestamptz not null default now(),

    constraint different_assignees
        check (
            previous_assignee_id is null
            or new_assignee_id is null
            or previous_assignee_id <> new_assignee_id
        )
);

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

create index idx_profiles_role_active
    on public.profiles(role, is_active);

create index idx_tasks_assignee_active
    on public.tasks(assignee_id, status, created_at desc)
    where deleted_at is null;

create index idx_tasks_manager_active
    on public.tasks(manager_id, status, created_at desc)
    where deleted_at is null;

create index idx_tasks_global
    on public.tasks(created_at desc)
    where assignee_id is null
      and deleted_at is null;

create index idx_tasks_object_active
    on public.tasks(object_id, created_at desc)
    where deleted_at is null;

create index idx_task_history_task
    on public.task_history(task_id, created_at desc);

create index idx_task_assignment_history_task
    on public.task_assignment_history(task_id, created_at desc);

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
    );
$$;

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and p.role = 'manager'::public.user_role
    );
$$;

create function private.is_executor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.is_active = true
          and p.role = 'executor'::public.user_role
    );
$$;

-- ============================================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================================

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function private.set_updated_at();

create trigger objects_set_updated_at
before update on public.objects
for each row
execute function private.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function private.set_updated_at();

-- ============================================================================
-- 10. OBJECT SECURITY TRIGGER
-- ============================================================================

create function private.objects_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' then
        if new.created_by is distinct from old.created_by
           or new.created_at is distinct from old.created_at then

            raise exception 'Object creator and creation date cannot be changed';
        end if;
    end if;

    if new.is_archived then
        if tg_op = 'INSERT' or not old.is_archived then
            new.archived_at := now();
            new.archived_by := (select auth.uid());
        end if;
    else
        new.archived_at := null;
        new.archived_by := null;
    end if;

    return new;
end;
$$;

create trigger objects_before_write
before insert or update on public.objects
for each row
execute function private.objects_before_write();

-- ============================================================================
-- 11. TASK SECURITY TRIGGER
-- ============================================================================

create function private.tasks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
       or new.object_id is distinct from old.object_id then

        raise exception 'Task creator, object and creation date cannot be changed';
    end if;

    return new;
end;
$$;

create trigger tasks_guard
before update on public.tasks
for each row
execute function private.tasks_guard();

-- ============================================================================
-- 12. APPEND-ONLY HISTORY
-- ============================================================================

create function private.forbid_history_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    raise exception 'History tables are append-only';
end;
$$;

create trigger task_history_append_only
before update or delete on public.task_history
for each row
execute function private.forbid_history_modification();

create trigger task_assignment_history_append_only
before update or delete on public.task_assignment_history
for each row
execute function private.forbid_history_modification();

-- ============================================================================
-- 13. CREATE PROFILE AFTER AUTH REGISTRATION
-- ============================================================================

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_name text;
begin
    v_name := coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Без имени'
    );

    insert into public.profiles(id, full_name)
    values(new.id, left(v_name, 200));

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_user();

-- ============================================================================
-- 14. TASK TRANSITIONS
-- ============================================================================

create table private.task_transitions (
    from_status public.task_status not null,

    to_status public.task_status not null,

    actor text not null
        check (actor in ('executor', 'manager')),

    primary key (from_status, to_status)
);

insert into private.task_transitions
(from_status, to_status, actor)
values
    ('new', 'in_progress', 'executor'),
    ('revision', 'in_progress', 'executor'),
    ('in_progress', 'under_review', 'executor'),
    ('under_review', 'accepted', 'manager'),
    ('under_review', 'revision', 'manager');

-- ============================================================================
-- 15. CREATE TASK — MANAGER ONLY
-- ============================================================================
-- New tasks always enter Global Tasks.
-- They have no assignee and no responsible manager.

create function public.create_task(
    p_title text,
    p_description text,
    p_object_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_id uuid;
begin
    if not private.is_manager() then
        raise exception 'Only an active manager can create tasks'
            using errcode = '42501';
    end if;

    if p_object_id is null
       or not exists (
            select 1
            from public.objects o
            where o.id = p_object_id
              and o.is_archived = false
       ) then

        raise exception 'Object not found or archived';
    end if;

    insert into public.tasks(
        title,
        description,
        object_id,
        assignee_id,
        manager_id,
        created_by
    )
    values(
        p_title,
        p_description,
        p_object_id,
        null,
        null,
        v_uid
    )
    returning id into v_id;

    insert into public.task_history(
        task_id,
        changed_by,
        old_status,
        new_status
    )
    values(v_id, v_uid, null, 'new');

    return v_id;
end;
$$;

-- ============================================================================
-- 16. ASSIGN OR REASSIGN TASK
-- ============================================================================
-- A manager can:
-- 1. Take a task from Global Tasks.
-- 2. Reassign a task that belongs to that manager.
--
-- A manager cannot reassign another manager's task.

create function public.assign_task(
    p_task_id uuid,
    p_assignee_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_task public.tasks%rowtype;
begin
    if not private.is_manager() then
        raise exception 'Only an active manager can assign tasks'
            using errcode = '42501';
    end if;

    select *
    into v_task
    from public.tasks
    where id = p_task_id
      and deleted_at is null
    for update;

    if not found then
        raise exception 'Task not found';
    end if;

    if v_task.assignee_id is not null
       and v_task.manager_id <> v_uid then

        raise exception 'You cannot modify another manager task'
            using errcode = '42501';
    end if;

    if v_task.status = 'accepted' then
        raise exception 'Accepted tasks cannot be reassigned';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_assignee_id
          and p.is_active = true
          and p.role = 'executor'::public.user_role
    ) then

        raise exception 'Executor must be active';
    end if;

    if exists (
        select 1
        from public.objects o
        where o.id = v_task.object_id
          and o.is_archived = true
    ) then

        raise exception 'Cannot assign a task to an archived object';
    end if;

    if v_task.assignee_id = p_assignee_id then
        raise exception 'Task is already assigned to this executor';
    end if;

    update public.tasks
    set assignee_id = p_assignee_id,
        manager_id = v_uid
    where id = p_task_id;

    insert into public.task_assignment_history(
        task_id,
        previous_assignee_id,
        new_assignee_id,
        changed_by
    )
    values(
        p_task_id,
        v_task.assignee_id,
        p_assignee_id,
        v_uid
    );

end;
$$;

-- ============================================================================
-- 17. UPDATE TASK — MANAGER ONLY
-- ============================================================================
-- Any manager can edit a Global Task.
-- Assigned tasks can only be edited by their responsible manager.

create function public.update_task(
    p_task_id uuid,
    p_title text,
    p_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not private.is_manager() then
        raise exception 'Only an active manager can edit tasks'
            using errcode = '42501';
    end if;

    update public.tasks
    set title = p_title,
        description = p_description
    where id = p_task_id
      and deleted_at is null
      and (
          assignee_id is null
          or manager_id = (select auth.uid())
      );

    if not found then
        raise exception 'Task not found or access denied';
    end if;
end;
$$;

-- ============================================================================
-- 18. CHANGE TASK STATUS
-- ============================================================================

create function public.change_task_status(
    p_task_id uuid,
    p_new_status public.task_status,
    p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_task public.tasks%rowtype;
    v_actor text;
    v_comment text := nullif(btrim(p_comment), '');
begin
    if not private.is_active_user() then
        raise exception 'Access denied'
            using errcode = '42501';
    end if;

    if p_comment is not null and length(p_comment) > 1000 then
        raise exception 'Comment cannot exceed 1000 characters';
    end if;

    select *
    into v_task
    from public.tasks
    where id = p_task_id
      and deleted_at is null
    for update;

    if not found then
        raise exception 'Task not found';
    end if;

    select actor
    into v_actor
    from private.task_transitions
    where from_status = v_task.status
      and to_status = p_new_status;

    if not found then
        raise exception 'This status transition is not allowed';
    end if;

    if v_actor = 'executor' then

        if not private.is_executor()
           or v_task.assignee_id <> v_uid then

            raise exception 'Only the assigned executor can change this status'
                using errcode = '42501';
        end if;

    elsif v_actor = 'manager' then

        if not private.is_manager()
           or v_task.manager_id <> v_uid then

            raise exception 'Only the responsible manager can review this task'
                using errcode = '42501';
        end if;

    end if;

    if p_new_status = 'revision' and v_comment is null then
        raise exception 'A comment is required for revision';
    end if;

    update public.tasks
    set status = p_new_status
    where id = p_task_id;

    insert into public.task_history(
        task_id,
        changed_by,
        old_status,
        new_status,
        comment
    )
    values(
        p_task_id,
        v_uid,
        v_task.status,
        p_new_status,
        v_comment
    );
end;
$$;

-- ============================================================================
-- 19. DEACTIVATE EXECUTOR
-- ============================================================================
-- When an executor is deactivated:
-- 1. Their unfinished tasks return to Global Tasks.
-- 2. assignee_id becomes NULL.
-- 3. manager_id becomes NULL.
-- 4. Status resets to new.
-- 5. Assignment and status history are preserved.
-- 6. Accepted tasks remain unchanged.

create function public.deactivate_executor(
    p_executor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := (select auth.uid());
    v_task record;
begin
    if not private.is_manager() then
        raise exception 'Only an active manager can deactivate executors'
            using errcode = '42501';
    end if;

    if p_executor_id is null
       or p_executor_id = v_uid then
        raise exception 'Invalid executor ID';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_executor_id
          and p.role = 'executor'::public.user_role
          and p.is_active = true
    ) then

        raise exception 'Active executor not found';
    end if;

    -- Lock all unfinished tasks before changing assignments.
    for v_task in
        select *
        from public.tasks
        where assignee_id = p_executor_id
          and deleted_at is null
          and status <> 'accepted'
        for update
    loop

        update public.tasks
        set assignee_id = null,
            manager_id = null,
            status = 'new'
        where id = v_task.id;

        if v_task.status <> 'new' then
            insert into public.task_history(
                task_id,
                changed_by,
                old_status,
                new_status,
                comment
            )
            values(
                v_task.id,
                v_uid,
                v_task.status,
                'new',
                'Returned to Global Tasks because executor was deactivated'
            );
        end if;

        insert into public.task_assignment_history(
            task_id,
            previous_assignee_id,
            new_assignee_id,
            changed_by
        )
        values(
            v_task.id,
            p_executor_id,
            null,
            v_uid
        );

    end loop;

    update public.profiles
    set is_active = false
    where id = p_executor_id;

end;
$$;

-- ============================================================================
-- 20. SOFT DELETE TASK
-- ============================================================================
-- Global tasks: any manager.
-- Assigned tasks: only responsible manager.

create function public.delete_task(
    p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not private.is_manager() then
        raise exception 'Only an active manager can delete tasks'
            using errcode = '42501';
    end if;

    update public.tasks
    set deleted_at = now(),
        deleted_by = (select auth.uid())
    where id = p_task_id
      and deleted_at is null
      and (
          assignee_id is null
          or manager_id = (select auth.uid())
      );

    if not found then
        raise exception 'Task not found or access denied';
    end if;
end;
$$;

-- ============================================================================
-- 21. TABLE PRIVILEGES
-- ============================================================================

revoke all on table
    public.profiles,
    public.objects,
    public.tasks,
    public.task_history,
    public.task_assignment_history
from anon, authenticated;

grant select on table
    public.profiles,
    public.objects,
    public.tasks,
    public.task_history,
    public.task_assignment_history
to authenticated;

-- Users can change only their own name.
grant update(full_name)
on public.profiles
to authenticated;

-- Managers can create and update objects.
grant insert(name, address)
on public.objects
to authenticated;

grant update(name, address, is_archived)
on public.objects
to authenticated;

-- ============================================================================
-- 22. RPC PERMISSIONS
-- ============================================================================

revoke execute on function
    public.create_task(text, text, uuid),
    public.assign_task(uuid, uuid),
    public.update_task(uuid, text, text),
    public.change_task_status(uuid, public.task_status, text),
    public.deactivate_executor(uuid),
    public.delete_task(uuid)
from public, anon, authenticated;

grant execute on function
    public.create_task(text, text, uuid),
    public.assign_task(uuid, uuid),
    public.update_task(uuid, text, text),
    public.change_task_status(uuid, public.task_status, text),
    public.deactivate_executor(uuid),
    public.delete_task(uuid)
to authenticated;

revoke all on all functions in schema private
from public, anon, authenticated;

grant execute on function private.is_active_user()
to authenticated;

grant execute on function private.is_manager()
to authenticated;

grant execute on function private.is_executor()
to authenticated;

-- ============================================================================
-- 23. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.task_assignment_history enable row level security;

-- ============================================================================
-- 24. PROFILES POLICIES
-- ============================================================================

-- Managers can see all profiles.
-- Executors can see only their own profile.

create policy profiles_select_visible
on public.profiles
for select
to authenticated
using (
    (
        select private.is_manager()
    )
    or
    (
        id = (select auth.uid())
        and (select private.is_active_user())
    )
);

create policy profiles_update_own_name
on public.profiles
for update
to authenticated
using (
    id = (select auth.uid())
    and (select private.is_active_user())
)
with check (
    id = (select auth.uid())
    and (select private.is_active_user())
);

-- ============================================================================
-- 25. OBJECT POLICIES
-- ============================================================================

-- Managers see all objects.
-- Executors see objects containing their assigned tasks.

create policy objects_select_visible
on public.objects
for select
to authenticated
using (
    (select private.is_manager())
    or
    (
        (select private.is_executor())
        and exists (
            select 1
            from public.tasks t
            where t.object_id = objects.id
              and t.assignee_id = (select auth.uid())
              and t.deleted_at is null
        )
    )
);

create policy objects_insert_manager
on public.objects
for insert
to authenticated
with check (
    (select private.is_manager())
    and created_by = (select auth.uid())
);

create policy objects_update_manager
on public.objects
for update
to authenticated
using (
    (select private.is_manager())
)
with check (
    (select private.is_manager())
);

-- ============================================================================
-- 26. TASK POLICIES
-- ============================================================================

-- Managers see:
--   all Global Tasks;
--   all tasks assigned by themselves;
--   all tasks assigned by other managers (read-only).
--
-- Executors see only their own active tasks.

create policy tasks_select_visible
on public.tasks
for select
to authenticated
using (
    (select private.is_manager())
    or
    (
        (select private.is_executor())
        and assignee_id = (select auth.uid())
        and deleted_at is null
    )
);

-- Direct INSERT/UPDATE/DELETE is intentionally not granted.
-- All task mutations must go through the RPC functions.

-- ============================================================================
-- 27. HISTORY POLICIES
-- ============================================================================

create policy task_history_select_visible
on public.task_history
for select
to authenticated
using (
    exists (
        select 1
        from public.tasks t
        where t.id = task_history.task_id
    )
);

create policy task_assignment_history_select_visible
on public.task_assignment_history
for select
to authenticated
using (
    exists (
        select 1
        from public.tasks t
        where t.id = task_assignment_history.task_id
    )
);

-- ============================================================================
-- 28. FINISH
-- ============================================================================

commit;

-- ============================================================================
-- AFTER MIGRATION
-- ============================================================================
--
-- 1. Disable public sign-ups in Supabase Auth settings.
--
-- 2. Create manager/executor accounts through Supabase Authentication.
--
-- 3. Profiles are automatically created with executor role.
--
-- 4. Promote the first manager manually:
--
-- update public.profiles p
-- set role = 'manager'
-- from auth.users u
-- where p.id = u.id
--   and u.email = 'manager@example.com';
--
-- 5. Never expose service_role keys in the frontend.
--
-- 6. Use authenticated Supabase clients and RPC functions.
--
-- ============================================================================