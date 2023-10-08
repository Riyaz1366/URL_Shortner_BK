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
const nanoid = require("nanoid");
const SECRET_KEY = process.env.SECRET;
router.use(cors());
const User = require("../model/Users");
const path = require("path");
const port = process.env.PORT;
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

function generateShortCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let shortCode = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    shortCode += characters.charAt(randomIndex);
  }

  return shortCode;
}

router.post("/shorten", async (req, res) => {
  const originalUrl = req.body.long_url;
  const short_code = generateShortCode(8);
  if (!originalUrl) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  try {
    const url = new ShortenedURL({
      long_url: originalUrl,
      short_key: short_code,
    });
    await url.save();

    res.json({ short_url: `http://localhost:3002/shorten/${short_code}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/shorten/:shortKey", async (req, res) => {
  const short_key = req.params.shortKey;

  try {
    const url = await ShortenedURL.findOne({ short_key });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    } else {
      url.Clicks += 1;
      await url.save();
      res.redirect(url.long_url);

    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get('/all-shortened-urls', async (req, res) => {
  try {
    const allUrls = await ShortenedURL.find({},'-_id short_key Clicks'); 
    res.status(200).json(allUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.status(404).json({ error: "Invalid or expired token." });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ error: "Reset token has expired." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.redirect("http://localhost:3002/changepassword");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
});

function generateVerificationToken() {
  return Math.floor(1000 + Math.random() * 9000);
}

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verificationToken = generateVerificationToken();
    user.verificationToken = verificationToken;

    await user.save();

    await transporter.sendMail({
      from: "riyaz.mohideen1366@gmail.com",
      to: email,
      subject: "Temporary Token for Password Reset",
      text: `Your temporary token for password reset is: ${verificationToken}`,
    });

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }

    res.sendFile(path.join(__dirname, "..", "reset-password.html"));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(404).json({ message: "Invalid or expired token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.verificationToken = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
