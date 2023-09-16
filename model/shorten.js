const mongoose = require("mongoose");
const shortid = require("shortid");

const urlSchema = new mongoose.Schema({
  long_url: {
    type: String,
    required: true,
  },
  short_key: {
    type: String,
    required: true,
    default: shortid.generate,
  },
  Clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ShortenedURL = mongoose.model("ShortenedURL", urlSchema);

module.exports = ShortenedURL;
