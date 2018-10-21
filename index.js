// @ts-check

const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const { authenticate } = require('./middlewares/authenticate');

const { authRoutes } = require('./routers/auth-routes');

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

app.use(express.urlencoded({ extended: true }));

app.get('/api/users/me', authenticate, (req, res) => {
  console.log('inside route');
  // @ts-ignore
  const user = req.user;
  console.log('Sending res');
  res.status(200).json(user);
});

app.use('/api/auth/users', authRoutes);

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
