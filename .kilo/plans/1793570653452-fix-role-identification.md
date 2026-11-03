# Plan: Fix role identification in sign-in/sign-up

## Problem
Users report that after authentication, accounts are not identified as landlord or student.

## Likely cause
In `src/components/AuthModal.jsx`, role selection state is local and only updates via signup role buttons. The submit payload depends on `role`, but switching between login/signup can leave stale role state; login never sends a role, relying on backend. Need verify the selected role is included in `api.register` and that `handleAuth(result)` stores returned `user.role`.

## Tasks
1. Inspect `AuthModal.jsx` submit handler and `api.register`/`api.login` to confirm role is transmitted and returned.
2. Ensure `role` resets to `boarder` when switching to signup and is included in register payload.
3. Ensure `handleAuth` sets `user` from API response including `role`.
4. Add guard: if signup role is landlord, pass `role: 'landlord'`; otherwise `boarder`.
5. Test with landlord and student test accounts.

## Admin handling
- Admin access remains backend-only: admins sign in with normal login and are identified via Supabase `user_metadata.isAdmin` or `role === 'admin'`.
- No admin signup toggle in AuthModal.
- Sign up as landlord -> app shows landlord UI.
- Sign up as student -> boarder UI.
- Login as existing landlord/student -> correct role.
