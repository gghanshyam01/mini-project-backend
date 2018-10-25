// @ts-check

const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const multer = require('multer');
const fs = require('fs');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const { authenticate } = require('./middlewares/authenticate');
const { authRoutes } = require('./routers/auth-routes');
const { Customer } = require('./models/customer');
const { User } = require('./models/user');

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

app.post(
  '/api/users/uploads/customer',
  authenticate,
  upload.single('file'),
  (req, res) => {
    // @ts-ignore
    if (!req.user.isAdmin) {
      return res.status(403).send('Insufficient privileges');
    }
    const file = req.file;
    const fileType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!file || !file.mimetype.match(fileType)) {
      return res.status(400).send('Please select a valid file');
    }
    const workbook = XLSX.readFile('uploads/' + file.originalname);
    const customerData = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]]
    );

    Customer.insertMany(customerData)
      .then(status => {
        res.json('All data inserted successfully');
        fs.unlink(`uploads/${file.originalname}`, err => {
          if (err) {
            return console.log('Error deleting excel file');
          }
          console.log('Deleted Excel file');
        });
      })
      .catch(err => {
        res.status(500).send(err);
      });
  }
);

app.get(`/api/customers`, authenticate, (req, res) => {
  // @ts-ignore
  if (!req.user.isAdmin) {
    return res.status(403).send('Insufficient privileges');
  }
  Customer.find({ isAssignedToUser: false }, (err, docs) => {
    if (err) {
      return res.status(500).send('Error fetching customers');
    }
    res.send(docs);
  });
});

app.post(`/api/customers`, authenticate, (req, res) => {
  // @ts-ignore
  if (!req.user.isAdmin) {
    return res.status(403).send('Insufficient privileges');
  }
  const k = req.params.key;
  const value = req.params.value;
  const data = Object.assign({ isAssignedToUser: false }, req.body);
  Customer.find(data, (err, docs) => {
    if (err) {
      return res.status(500).send('Error fetching customers');
    }
    res.send(docs);
  });
});
app.get(`/api/users`, authenticate, (req, res) => {
  // @ts-ignore
  if (!req.user.isAdmin) {
    return res.status(403).send('Insufficient privileges');
  }
  User.find({ isAdmin: false }, '_id firstName lastName', (err, docs) => {
    if (err) {
      return res.status(500).send('Error fetching customers');
    }
    res.send(docs);
  });
});

app.patch(`/api/users/:_id`, authenticate, (req, res) => {
  const _id = req.params._id;
  // return console.log(req.body);
  const custData = req.body;
  custData.forEach(cust => {
    cust._id = mongoose.Types.ObjectId(cust._id);
  });
  User.findByIdAndUpdate(
    _id,
    { $push: { customers: { $each: custData } } },
    (err, status) => {
      if (err) {
        console.log(err);
        res.status(500).send('Error updating value');
      } else {
        res.send('Assigned customer to user successfully');
      }
    }
  );
  const customers = req.body;

  customers.forEach(customer => {
    Customer.findByIdAndUpdate(
      customer._id,
      { $set: { isAssignedToUser: true } },
      (err, status) => {
        if (err) {
          console.log('Error updating customer', err);
        } else {
          console.log('Success');
        }
      }
    );
  });
});

app.use('/api/auth/users', authRoutes);

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
