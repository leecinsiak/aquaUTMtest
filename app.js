require('dotenv').config();

const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "")));

// Home routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "", "signup.html"));
});

app.get("/events", (req, res) => {
  res.sendFile(path.join(__dirname, "", "events.html"));
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "", "forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send("Invalid reset link.");
  }
  res.sendFile(path.join(__dirname, "", "reset-password.html"));
});

// Signup route
app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check for existing user
    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.send("User already exists. Please use a different email.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into SQL
    await db.promise().query(
      "INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)",
      [firstName, lastName, email, hashedPassword]
    );

    console.log("✅ New user registered:", email);
    res.sendFile(path.join(__dirname, "public", "login.html"));
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).send("Error registering user.");
  }
});


// Login route with login logging
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];

  try {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.send("Email not found. Please sign up first.");
    }

    const user = rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.send("Incorrect password.");
    }

    // ✅ Log the login event
    await db.promise().query(
      "INSERT INTO login_logs (user_id, email, ip_address, user_agent) VALUES (?, ?, ?, ?)",
      [user.id, email, ipAddress, userAgent]
    );

    console.log(`✅ Login successful for: ${email} (IP: ${ipAddress})`);
    res.sendFile(path.join(__dirname, "public", "welcome.html"));
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed.");
  }
});

// Forgot password route
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.send("If an account with that email exists, a reset link has been sent.");
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store token in database
    await db.promise().query(
      "INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, email, token, expiresAt]
    );

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:${process.env.PORT || 5000}/reset-password?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset - AquaUTM",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${email}`);
    res.send("If an account with that email exists, a reset link has been sent.");
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).send("Error sending reset email.");
  }
});

// Reset password route
app.post("/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.send("Passwords do not match.");
  }

  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );
    if (rows.length === 0) {
      return res.send("Invalid or expired reset token.");
    }

    const reset = rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, reset.user_id]);

    // Delete used token
    await db.promise().query("DELETE FROM password_resets WHERE token = ?", [token]);

    console.log(`✅ Password reset for user ID: ${reset.user_id}`);
    res.send("Password reset successfully. You can now log in with your new password.");
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).send("Error resetting password.");
  }
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
