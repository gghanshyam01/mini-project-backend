const mongoose = require('mongoose');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const { User } = require('./models/user');

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

const user = new User({
  firstName: 'Ghanshyam',
  lastName: 'Gupta',
  email: 'gghanshyam01@gmail.com',
  dob: '01/12/1222',
  password: '12345',
  gender: 'Male',
  mobileNumber: '9604607557',
  isAdmin: true
});
user
  .save()
  .then(doc => console.log(doc))
  .catch(err => console.log('Error', err));
