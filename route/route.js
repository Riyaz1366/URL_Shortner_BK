require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");
const cors = require("cors");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const verificationTokenExpiration = 600;
const ShortenedURL = require("../model/shorten.js");
const crypto = require("crypto");
router.use(express.json());

const SECRET_KEY = process.env.SECRET;
router.use(cors());
const User = require("../model/Users");

const user = process.env.User;
const pass = process.env.Pass;
const gmail = process.env.service;

function generateShortKey() {
  return crypto.randomBytes(4).toString("hex");
}

const transporter = nodemailer.createTransport({
  service: gmail,
  port: 587,
  secure: false,
  auth: {
    user: user,
    pass: pass,
  },
});

router.get("/", (req, res) => {
  res.send("Login Page");
});

router.post("/users", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      verificationToken: jwt.sign({ email }, SECRET_KEY, {
        expiresIn: verificationTokenExpiration,
      }),
      password: hashedPassword,
      verified: false,
    });
    const savedUser = await newUser.save();

    const mailOptions = {
      from: user,
      to: email,
      subject: "Account Verification",
      html: `<p>Click the following link to verify your account:</p>
      <a href="http://localhost:3002/confirm/${newUser.verificationToken}">Verify Account</a>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ error: "Error sending verification email" });
      } else {
        console.log("Verification email sent: " + info.response);
        res.json({
          message:
            "Registration successful. Please check your email for verification instructions.",
        });
      }
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({ error: "Email address already exists." });
    } else {
      res.status(500).json({ error: "Error registering user" });
    }
  }
});

router.get("/confirm/:token", async (req, res) => {
  try {
    const token = req.params.token;

    const decodedToken = jwt.verify(token, SECRET_KEY);

    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();
    res.status(201).json({ error: "Verification sucessfull" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error confirming email" });
  }
});

router.get("/register", async (req, res) => {
  try {
    const users = await User.find();
    console.log(users);
    res.status(201).json(users);
  } catch (error) {
    res.status(500).json({ error: "unable to get users" });
  }
});

router.get("/register/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invaild credentials" });
    }

    if (!user.verified) {
      return res.status(401).json({
        error:
          "Account not verified. Please verify your email before logging in.",
      });
    }

    const isPassword = await bcrypt.compare(password, user.password);

    if (!isPassword) {
      return res.status(401).json({ error: " invalid username and password" });
    }

    const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
      expiresIn: "1hr",
    });
    res.json({ message: "Login Successful", token });
  } catch (error) {
    res.status(500).json({ error: "Error logging In" });
  }
});

router.post("/shorten", async (req, res) => {
  const originalUrl = req.body.long_url;

  if (!originalUrl) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    const url = new ShortenedURL({ long_url: originalUrl });
    await url.save();

    res.json({ originalUrl, short_url: url.short_key });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route to redirect to the original URL
router.get("/shorten/:shortKey", async (req, res) => {
  const shortKey = req.params.shortKey;

  try {
    const url = await ShortenedURL.findOne({ short_key: shortKey });
    console.log("Received shortKey:", shortKey);
    if (url) {
      res.redirect(url.original_url);
    } else {
      res.status(404).send("URL not found");
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
