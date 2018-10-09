// @ts-check
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const mongoose = require('mongoose');
const { User } = require('./models/user');
const { authenticate } = require('./middlewares/authenticate');
const {sendEmail}  = require('./email/nodemailer');

mongoose.set('useCreateIndex', true);

// @ts-ignore
mongoose
  .connect(
    URL,
    mongooseOptions
  )
  .then(res => console.debug('Connected to MongoDB'))
  .catch(err => console.debug('Error while connecting to MongoDB'));

const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

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
        res.status(403).send({ error });
      }
      res.status(401).send({
        error: 'Email or password incorrect'
      });
    });
};

const registerUser = (req, res) => {
  const user = new User(req.body);
  user
    .save()
    .then(() => {
      sendEmail(user);
      res.status(201).send({ msg: 'User created successfully' });
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(err);
    }); // dont change 'err' to 'error'.
};

app.get('/api/users/me', authenticate, (req, res) => {
  // @ts-ignore
  res.send(req.user);
});

app.post('/api/auth/users/register', registerUser);

app.post('/api/auth/users/login', loginUser);

app.post('/api/auth/users/activate/:token', (req, res) => {
  // @ts-ignore
  User.findByToken(req.params.token, 'accountActivate')
    .then(user => {
      if (!user) {
        return Promise.reject('No user exists');
      }
      user.isActivated = true;
      return user.save();
    })
    .then(doc => {
      res.send({ msg: 'User account activated. Please login to continue.' });
    })
    .catch(error => {
      res.status(500).send({ error });
    });
});

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
