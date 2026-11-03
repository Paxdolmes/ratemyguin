-- One account for Apple's App Store reviewers. Sign-in normally emails a code,
-- which a reviewer can't receive, so this one account signs in with a password.
-- The deploy workflow calls this with the APP_REVIEW_PASSWORD secret; the password
-- never lives in the repo. Re-running it resets the password and puts the account
-- back if a reviewer deleted it.

create function private.setup_review_account(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  if char_length(p_password) < 10 then raise exception 'Use a password of 10 or more characters'; end if;
  select id into uid from auth.users where email = lower(p_email);
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(p_email),
      crypt(p_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true), now(), now(), now());
  else
    update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = uid;
  end if;
  insert into public.profiles (id, handle, display_name, home_city, is_public, adult_confirmed_at)
  values (uid, 'appreview', 'App Review', 'London', false, now())
  on conflict (id) do nothing;
  return uid;
end $$;
revoke all on function private.setup_review_account(text, text) from public, anon, authenticated;
