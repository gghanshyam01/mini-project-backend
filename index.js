// @ts-check

const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const multer = require('multer');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const { authenticate } = require('./middlewares/authenticate');
const { authRoutes } = require('./routers/auth-routes');
const { Customer } = require('./models/customer');

const app = express();

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });
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

app.post('/api/users/uploads/customer', upload.single('file'), (req, res) => {
  const file = req.file;
  const workbook = XLSX.readFile('uploads/' + file.originalname);
  const customerData = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  // console.log(customerData);
  Customer.insertMany(customerData)
    .then(status => {
      res.send(status);
    })
    .catch(err => {
      console.log(err);
      res.send(err);
    });
});

app.use('/api/auth/users', authRoutes);

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
