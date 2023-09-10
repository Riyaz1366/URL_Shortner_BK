const express = require('express')
const mongoose = require('mongoose')

const router = express.Router();

const User = require('../model/model.js');



router.get("/", (req, res) => {
    res.send("Login Page");
  });





router.post('/users', async (req, res) => {
  try {
    // Create a new user based on the request body
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    res.status(201).json(savedUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'An error occurred while creating the user' });
  }
});

  
module.exports = router;