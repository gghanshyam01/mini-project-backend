// @ts-check

const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const { User } = require('./models/user');
const { authenticate } = require('./middlewares/authenticate');
const { sendEmail } = require('./email/nodemailer');

const app = express();

mongoose.set('useCreateIndex', true);

// @ts-ignore
mongoose
  .connect(
    URL,
    mongooseOptions
  )
  .then(res => console.debug('Connected to MongoDB'))
  .catch(err => console.debug('Error while connecting to MongoDB'));

const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

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

const loginUser = (req, res) => {
  const user = req.body;
  // @ts-ignore
  User.findByCredentials(user.email, user.password)
    .then(user => {
      return user.generateAuthToken('auth', '10h');
    })
    .then(token => {
      res.cookie('SESSIONID', token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 10,
        secure: false
      });
      res.send({ token, expiresIn: '10 hrs' });
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

const registerUser = (req, res) => {
  const user = new User(req.body);
  user
    .save()
    .then(() => {
      sendEmail(user);
      res.status(200).send({
        msg:
          "User account created successfully. You'll be able to login if Admin activates your account within 7 days"
      });
    })
    .catch(err => {
      res.status(400).send(err);
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

app.get('/api/users/me', authenticate, (req, res) => {
  // @ts-ignore
  const user = req.user;
  res.status(200).json(user);
});

app.post('/api/auth/users/register', registerUser);

app.post('/api/auth/users/login', loginUser);

app.post('/api/auth/users/activate', activateUser);

app.delete('/api/auth/users/me/logout', authenticate, logOutUser);

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
