const mongoose = require('mongoose');
const { isEmail, isMobilePhone } = require('validator');
const uniqueValidator = require('mongoose-unique-validator');
const jwt = require('jsonwebtoken');

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
            message: 'Please enter a valid email id'
        }
    },
    mobileNumber: {
        type: Number,
        validate: {
            validator: function (v) {
                return isMobilePhone('' + v, 'en-IN');
            },
            message: 'Please enter a valid phone number'
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
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
});

userSchema.plugin(uniqueValidator, { message: 'This email id is already in use.' });

userSchema.methods.generateAuthToken = function () {
    const user = this;
    const access = 'auth';
    const token = jwt.sign({ _id: user._id.toHexString(), access }, 'abc123');
    user.tokens.push({ access, token });

    return user.save().then(() => token);
};

userSchema.statics.findByToken = function (cookie) {
    const User = this;
    let decoded = {};
    let token = '';
    try {
        token = cookie.SESSIONID;
        decoded = jwt.verify(token, 'abc123');
        console.log(decoded);
    } catch(e) {
        return Promise.reject();
    }
    return User.findOne({
        '_id': decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

var User = mongoose.model('User', userSchema);

module.exports = { User };