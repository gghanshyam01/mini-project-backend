const express = require('express');
const multer = require('multer');
const fs = require('fs');

const { sendEmail } = require('../email/nodemailer');
const { User } = require('../models/user');
const { authenticate } = require('../middlewares/authenticate');

const authRoutes = express.Router();

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

const registerUser = (req, res) => {
  req.body.confirmPassword = undefined;
  const user = new User(req.body);
  const file = req.file;
  if (!file) {
    return res.status(400).send('Please upload a valid ID proof Image');
  }
  console.log(req.body);
  const extArray = file.originalname.split('.');
  const ext = extArray[extArray.length - 1];
  const fileName = `${user._id}.${ext}`;
  user.imageUrl = fileName;
  user
    .save()
    .then(() => {
      sendEmail(user, req.headers.host, req.protocol);
      res.status(200).send({
        msg:
          "User account created successfully. You'll be able to login if Admin activates your account within 7 days"
      });
      fs.rename(`uploads/${file.originalname}`, `uploads/${fileName}`, err => {
        if (err) {
          return console.log('Error renaming file');
        }
        console.log('Image mapped to user');
      });
    })
    .catch(err => {
      res.status(400).send(err);
    });
};

const loginUser = (req, res) => {
  let user = req.body;
  // @ts-ignore
  User.findByCredentials(user.email, user.password)
    .then(userData => {
      user = userData;
      return userData.generateAuthToken('auth', '10h');
    })
    .then(token => {
      user.password = undefined;
      user.tokens = undefined;
      user.isActivated = undefined;
      res.cookie('SESSIONID', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 10,
        secure: false
      });
      res.send(user);
    })
    .catch(error => {
      if (error) {
        res.status(403).send(error);
        console.log(error);
      } else {
        res.status(401).send('Email or password incorrect');
      }
    });
};

const activateUser = (req, res) => {
  const token = req.body.token;
  // @ts-ignore
  User.findByToken(token, 'accountActivate')
    .then(user => {
      if (!user) {
        return Promise.reject('No user exists');
      }
      user.isActivated = true;
      return user.save();
    })
    .then(doc => {
      res.send({ msg: 'User account activated successfully.' });
    })
    .catch(error => {
      res.status(404).send(error);
    });
};

const logOutUser = (req, res) => {
  // @ts-ignore
  req.user
    .deleteToken(req.cookies.SESSIONID)
    .then(status => {
      res.clearCookie('SESSIONID');
      res.status(200).send();
    })
    .catch(err => {
      console.log('error: ', err);
      res.status(400).send(err);
    });
};
authRoutes.post('/register', upload.single('img'), registerUser);

authRoutes.post('/login', loginUser);

authRoutes.post('/activate', activateUser);

authRoutes.delete('/me/logout', authenticate, logOutUser);

module.exports = { authRoutes };
