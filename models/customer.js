const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  'Vehicle Number': {
    type: String,
    required: true
  },
  'Customer Name': {
    type: String,
    required: true
  },
  'Customer Contact Number': {
    type: String,
    required: true
  },
  'Car Make': {
    type: String,
    required: true
  },
  'Car Model': {
    type: String,
    required: true
  },
  'Vehicle Type': {
    type: String,
    required: true
  }
});

var Customer = mongoose.model('Customer', customerSchema);

module.exports = { Customer };
