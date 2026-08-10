# TODO - Reports & Users Module Updates

## Reports Module (Monthly Inventory Report)

### Server side
- [x] Add `generateMonthlyInventoryReport` controller in `reportController.js`
- [x] Register route `GET /reports/monthly-inventory` in `reportRoutes.js`

### Client side
- [x] Add `getMonthlyInventoryReport(month)` to `reportApi.js`
- [x] Rewrite `ReportsPage.jsx` as focused Monthly Inventory Report UI
- [x] Add `@media print` CSS in `index.css` for clean A4 printing
- [x] Fix printing/pagination: repeated table headers, no row splitting, header kept together, proper A4 flow
- [x] Move pagination indicator to upper-right header corner, starts at "Page 1"
- [x] Reduce excessive top space in printable header

## Users Module (Restrict to single Admin account)

### Backend
- [x] Add `changePassword` controller in `authController.js` (verify current password, validate, update hashed)
- [x] Register `PUT /api/auth/change-password` (protected) in `authRoutes.js`

### Client side
- [x] Add `changePassword(currentPassword, newPassword)` to `authApi.js`
- [x] Rewrite `UsersPage.jsx` to single Admin Account view with Change Password dialog
- [x] Remove multi-user / add-user / role-selection / stats functionality

### Testing
- [x] Verify server compiles (node --check)
- [x] Verify client builds (vite build)
