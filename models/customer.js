const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  vehicleNo: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: true
  },
  carMake: {
    type: String,
    required: true
  },
  carModel: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    required: true
  }
});

var Customer = mongoose.model('Customer', customerSchema);

module.exports = { Customer };
