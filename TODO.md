# TODO: Implement Forgot Password Feature

- [x] Add "Forgot Password?" link to login.html below the login form.
- [x] Create forgot-password.html: page with form to enter email.
- [x] Create reset-password.html: page with form to enter new password (accessed via token link).
- [x] Update aquautm.sql: add password_resets table to store reset tokens.
- [x] Update package.json: add nodemailer dependency.
- [x] Update app.js: add routes for forgot password flow (GET/POST /forgot-password, GET/POST /reset-password) and email sending logic.
- [x] Install nodemailer via npm.
- [x] Set up SMTP email configuration in .env (e.g., Gmail or other provider).
- [x] Test the forgot password flow end-to-end.
