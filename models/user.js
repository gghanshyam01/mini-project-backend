const mongoose = require("mongoose");
const { isEmail, isMobilePhone } = require("validator");
const uniqueValidator = require("mongoose-unique-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    validate: {
      validator: isEmail,
      message: "Please enter a valid email id"
    }
  },
  mobileNumber: {
    type: String,
    validate: {
      validator: function(number) {
        return isMobilePhone(number, "en-IN");
      },
      message: "Please enter a valid phone number"
    }
  },
  gender: {
    type: String,
    required: true
  },
  dob: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isActivated: {
    type: Boolean,
    default: false
  },
  tokens: [
    {
      access: {
        type: String,
        required: true
      },
      token: {
        type: String,
        required: true
      }
    }
  ]
});

userSchema.plugin(uniqueValidator, {
  message: "This email id is already in use."
});

userSchema.methods.generateAuthToken = function() {
  const user = this;
  const access = "auth";
  const token = jwt.sign({ _id: user._id.toHexString(), access }, "abc123");
  user.tokens.push({ access, token });
  return new Promise((resolve, reject) => {
    resolve(token);
  });
  // return user.save().then(() => token);
};

userSchema.statics.findByToken = function(cookie) {
  const User = this;
  let decoded = {};
  let token = "";
  try {
    token = cookie.SESSIONID;
    decoded = jwt.verify(token, "abc123");
    console.log(decoded);
  } catch (e) {
    return Promise.reject();
  }
  return User.findOne({
    _id: decoded._id,
    "tokens.token": token,
    "tokens.access": "auth"
  });
};

userSchema.statics.findByCredentials = function(email, password) {
  const User = this;
  return User.findOne({ email })
    .then(user => {
      if (user) {
        return new Promise((resolve, reject) => {
          return bcrypt.compare(password, user.password, (err, verified) => {
            if (verified) {
              resolve(user);
            } else {
              reject();
            }
          });
        });
      } else {
        return Promise.reject();
      }
    });
};

userSchema.pre("save", function(next) {
  const user = this;
  if (user.isModified("password")) {
    bcrypt.genSalt(10, (err, salt) => {
      if (!err) {
        bcrypt.hash(user.password, salt, (err, hash) => {
          if (!err) {
            user.password = hash;
            next();
          }
        });
      }
    });
  } else {
    next();
  }
});

userSchema.post("save", function(doc, next) {
  const user = this;
  // if (!user.isModified('email'))
  const email = user.email;
  console.log('Reached post hook with', doc.email);
  next();
});

var User = mongoose.model("User", userSchema);

module.exports = { User };
