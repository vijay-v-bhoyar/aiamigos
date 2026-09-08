-- Close project-membership self-enrollment and cross-project child-row IDOR paths.
-- Apply only after the ordered foundation migrations pass in a verified development project.

set local lock_timeout = '2s';
set local statement_timeout = '60s';

create or replace function public.is_project_owner(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(target_project_id) or exists (
    select 1
    from public.project_members m
    where m.project_id = target_project_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(target_project_id) or exists (
    select 1
    from public.project_members m
    where m.project_id = target_project_id
      and m.user_id = auth.uid()
      and m.member_role = 'editor'
  );
$$;

revoke all on function public.is_project_owner(uuid), public.can_view_project(uuid), public.can_edit_project(uuid) from public, anon;
grant execute on function public.is_project_owner(uuid), public.can_view_project(uuid), public.can_edit_project(uuid) to authenticated;

drop policy if exists projects_owner on public.projects;
create policy projects_select on public.projects for select to authenticated using (public.can_view_project(id));
create policy projects_insert on public.projects for insert to authenticated with check (
  owner_id = auth.uid()
  and (organization_id is null or exists (
    select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()
  ))
);
create policy projects_update on public.projects for update to authenticated
  using (public.is_project_owner(id))
  with check (
    owner_id = auth.uid()
    and (organization_id is null or exists (
      select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid()
    ))
  );
create policy projects_delete on public.projects for delete to authenticated using (public.is_project_owner(id));

drop policy if exists project_members_owner_or_member on public.project_members;
create policy project_members_select on public.project_members for select to authenticated using (public.can_view_project(project_id));
create policy project_members_insert on public.project_members for insert to authenticated with check (
  public.is_project_owner(project_id) and member_role in ('editor', 'viewer')
);
create policy project_members_update on public.project_members for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id) and member_role in ('editor', 'viewer'));
create policy project_members_delete on public.project_members for delete to authenticated using (public.is_project_owner(project_id));

drop policy if exists artifacts_owner on public.artifacts;
create policy artifacts_select on public.artifacts for select to authenticated using (public.can_view_project(project_id));
create policy artifacts_insert on public.artifacts for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy artifacts_update on public.artifacts for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy artifacts_delete on public.artifacts for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists experiments_owner on public.experiments;
create policy experiments_select on public.experiments for select to authenticated using (public.can_view_project(project_id));
create policy experiments_insert on public.experiments for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy experiments_update on public.experiments for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy experiments_delete on public.experiments for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists evaluations_owner on public.evaluations;
create policy evaluations_select on public.evaluations for select to authenticated using (public.can_view_project(project_id));
create policy evaluations_insert on public.evaluations for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy evaluations_update on public.evaluations for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy evaluations_delete on public.evaluations for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists outcomes_owner on public.outcome_measurements;
create policy outcomes_select on public.outcome_measurements for select to authenticated using (public.can_view_project(project_id));
create policy outcomes_insert on public.outcome_measurements for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy outcomes_update on public.outcome_measurements for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy outcomes_delete on public.outcome_measurements for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists evaluation_cases_owner on public.evaluation_cases;
create policy evaluation_cases_select on public.evaluation_cases for select to authenticated using (public.can_view_project(project_id));
create policy evaluation_cases_insert on public.evaluation_cases for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy evaluation_cases_update on public.evaluation_cases for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy evaluation_cases_delete on public.evaluation_cases for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists proof_packs_owner on public.proof_packs;
create policy proof_packs_select on public.proof_packs for select to authenticated using (public.can_view_project(project_id));
create policy proof_packs_insert on public.proof_packs for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy proof_packs_update on public.proof_packs for update to authenticated
  using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id))
  with check ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));
create policy proof_packs_delete on public.proof_packs for delete to authenticated using ((owner_id = auth.uid() or public.is_project_owner(project_id)) and public.can_edit_project(project_id));

drop policy if exists submissions_owner_or_reviewer on public.playbook_submissions;
create policy submissions_select on public.playbook_submissions for select to authenticated using (owner_id = auth.uid() or public.is_reviewer());
create policy submissions_insert on public.playbook_submissions for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy submissions_update on public.playbook_submissions for update to authenticated
  using ((owner_id = auth.uid() and public.can_edit_project(project_id)) or public.is_reviewer())
  with check ((owner_id = auth.uid() and public.can_edit_project(project_id)) or public.is_reviewer());
create policy submissions_delete on public.playbook_submissions for delete to authenticated using (owner_id = auth.uid() and public.can_edit_project(project_id));

drop policy if exists forks_owner on public.playbook_forks;
create policy forks_select on public.playbook_forks for select to authenticated using (owner_id = auth.uid() and public.can_view_project(project_id));
create policy forks_insert on public.playbook_forks for insert to authenticated with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy forks_update on public.playbook_forks for update to authenticated
  using (owner_id = auth.uid() and public.can_edit_project(project_id))
  with check (owner_id = auth.uid() and public.can_edit_project(project_id));
create policy forks_delete on public.playbook_forks for delete to authenticated using (owner_id = auth.uid() and public.can_edit_project(project_id));

drop policy if exists run_reports_owner on public.playbook_run_reports;
create policy run_reports_select on public.playbook_run_reports for select to authenticated using (
  owner_id = auth.uid() and (project_id is null or public.can_view_project(project_id))
);
create policy run_reports_insert on public.playbook_run_reports for insert to authenticated with check (
  owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))
);
create policy run_reports_update on public.playbook_run_reports for update to authenticated
  using (owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id)))
  with check (owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id)));
create policy run_reports_delete on public.playbook_run_reports for delete to authenticated using (
  owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))
);

drop policy if exists challenge_entries_owner on public.challenge_entries;
create policy challenge_entries_select on public.challenge_entries for select to authenticated using (owner_id = auth.uid() or public.is_reviewer());
create policy challenge_entries_insert on public.challenge_entries for insert to authenticated with check (
  owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))
);
create policy challenge_entries_update on public.challenge_entries for update to authenticated
  using ((owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))) or public.is_reviewer())
  with check ((owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))) or public.is_reviewer());
create policy challenge_entries_delete on public.challenge_entries for delete to authenticated using (
  owner_id = auth.uid() and (project_id is null or public.can_edit_project(project_id))
);

drop policy if exists audit_owner_insert on public.audit_events;
drop policy if exists audit_owner_read on public.audit_events;
create policy audit_insert on public.audit_events for insert to authenticated with check (
  owner_id = auth.uid() and (project_id is null or public.can_view_project(project_id))
);
create policy audit_select on public.audit_events for select to authenticated using (owner_id = auth.uid() or public.is_reviewer());
