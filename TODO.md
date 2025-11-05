# TODO: Fix Profile Info and Real-Time Search

## 1. Fix Profile Info in Navbar
- [x] Modify Dashboard.tsx to fetch current user info on mount using api.me()
- [x] Pass user info to Navbar component
- [x] Update Navbar.tsx to display actual user name, email, and role instead of hardcoded values

## 2. Make Search Real-Time with Debouncing
- [x] Add debounced search in Dashboard.tsx to delay API calls until user stops typing
- [ ] Optionally add client-side search filtering in DeviceList.tsx for immediate visual feedback

## Followup Steps
- [x] Test profile display with actual user data
- [x] Verify search debouncing reduces API calls while maintaining responsiveness
- [x] Ensure search works across device code, name, customer, location, IP
