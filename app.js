require('dotenv').config();

const express = require("express");


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





// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
