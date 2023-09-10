const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const router = express.Router();
const jwt = require('jsonwebtoken');

const SECRET_KEY = "screctkey";

const User = require("../model/Users");

router.get("/", (req, res) => {
  res.send("Login Page");
});

router.post("/users", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });

    // Create a new user based on the request body
    // const newUser = new User({
    //     username: req.body.username,
    //     email: req.body.email,
    //     password: req.body.password,

    // });
    // Save the new user to the database
    const savedUser = await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({ error: 'Email address already exists.' });
    } else {
      // Handle other errors gracefully
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'An error occurred while creating the user.' });
    }
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

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); 
    
    if (!user) {
      return res.status(401).json({ error: "Invaild credentials" });
    }
    const isPassword = await bcrypt.compare(password, user.password);

    if (!isPassword) {
      return res.status(401).json({ error: " invalid username and password" });
    }

    const token = jwt.sign({ userId: user._id }, SECRET_KEY, {  expiresIn: "1hr",})
    res.json({ message: "Login Sucessfull" })

    
  } catch (error) { 
    
    res.status(500).json({ error: "Error logging In" });
  }
});

module.exports = router;
