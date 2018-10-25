const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  contactNumber: {
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
  },
  isAssignedToUser: {
    type: Boolean,
    required: true,
    default: false
  },
  finished: {
    type: Boolean,
    default: false
  },
  newlyAssigned: {
    type: Boolean,
    default: true
  },
  feedback: [
    {
      comment: {
        type: String
      },
      nextDate: {
        type: String
      }
    }
  ],
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
});

var Customer = mongoose.model('Customer', customerSchema);

module.exports = { Customer };
