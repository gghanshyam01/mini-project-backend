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
const {
  shouldBeAdmin,
  shouldBeUser
} = require('./middlewares/check-user-type');
const { authRoutes } = require('./routers/auth-routes');
const { Customer } = require('./models/customer');
const { User } = require('./models/user');

const app = express();
app.use(express.static(__dirname + '/views'));
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
  shouldBeAdmin,
  upload.single('file'),
  (req, res) => {
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

app.get(`/api/customers`, authenticate, shouldBeAdmin, (req, res) => {
  Customer.find({ isAssignedToUser: false }, (err, docs) => {
    if (err) {
      return res.status(500).send('Error fetching customers');
    }
    res.send(docs);
  });
});

app.post(`/api/customers/filter`, authenticate, shouldBeAdmin, (req, res) => {
  for (let k in req.body) {
    let val = req.body[k];
    req.body[k] = new RegExp(val, 'i');
  }
  const data = Object.assign({ isAssignedToUser: false }, req.body);
  Customer.find(data, (err, docs) => {
    if (err) {
      return res.status(500).send('Error fetching customers');
    }
    res.send(docs);
  });
});
app.get(`/api/users`, authenticate, shouldBeAdmin, (req, res) => {
  User.find(
    { isAdmin: false, isActivated: true },
    '_id firstName lastName',
    (err, docs) => {
      if (err) {
        return res.status(500).send('Error fetching customers');
      }
      res.send(docs);
    }
  );
});

app.patch(`/api/users/:_id`, authenticate, shouldBeAdmin, (req, res) => {
  const _id = req.params._id;
  // return console.log(req.body);
  const custData = req.body;
  const idArr = [];
  custData.forEach(cust => {
    idArr.push(cust._id);
  });
  User.findByIdAndUpdate(
    _id,
    { $push: { customers: { $each: idArr } } },
    (err, status) => {
      if (err) {
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

app.get(`/api/users/me/customers`, authenticate, (req, res) => {
  // @ts-ignore
  const _id = req.user._id;
  User.findOne({ _id: '' + _id })
    .populate({ path: 'customers', match: { finished: { $eq: false } } })
    .exec(function(err, resp) {
      if (err) {
        console.log('Error', err);
        return res.status(500).send('Error sending data');
      }
      res.send(resp.customers);
    });
});

// Get customers with status finished
app.get(
  `/api/users/me/customers/finished`,
  authenticate,
  shouldBeUser,
  (req, res) => {
    // @ts-ignore
    const _id = req.user._id;
    User.findOne({ _id: '' + _id })
      .populate({
        path: 'customers',
        match: { finished: { $eq: true } }
      })
      .exec(function(err, resp) {
        if (err) {
          console.log('Error', err);
          return res.status(500).send('Error sending data');
        }
        res.send(resp.customers);
      });
  }
);

// To get notification-like newly assigned list
app.get(
  `/api/users/me/customers/newlyassigned`,
  authenticate,
  shouldBeUser,
  (req, res) => {
    // @ts-ignore
    const _id = req.user._id;
    User.findOne({ _id: '' + _id })
      .populate({
        path: 'customers',
        match: { newlyAssigned: { $eq: true } }
      })
      .exec(function(err, resp) {
        if (err) {
          console.log('Error', err);
          return res.status(500).send('Error sending data');
        }
        res.send(resp.customers);
        const custArr = resp.customers;
        custArr.forEach(c => {
          Customer.findByIdAndUpdate(
            c._id,
            { $set: { newlyAssigned: false } },
            (err, status) => {
              if (err) {
                console.log('Error in newly assigned');
              }
            }
          );
        });
      });
  }
);

// To get info for displaying status chart
app.get('/api/customers/charts', authenticate, shouldBeAdmin, (req, res) => {
  let fCount = 0;
  let totalCount = 0;

  Customer.countDocuments({}, (err, count) => {
    if (err) {
      return res.status(500).send('Error occurred');
    }
    totalCount = count;
    Customer.count({ finished: true }, (err, finishCount) => {
      if (err) {
        return res.status(500).send('Error occurred');
      }
      fCount = finishCount;
      let assignedCount = 0;
      Customer.count({ isAssignedToUser: true }, (err, count) => {
        if (err) {
          return res.status(500).send('Error occurred');
        }
        assignedCount = count;
        res.send({
          finishedCount: fCount || 0,
          assignedCount: assignedCount,
          totalCount: totalCount,
          remainingCount: totalCount - assignedCount
        });
      });
    });
  });
});

app.patch('/api/customers/:_id', authenticate, shouldBeUser, (req, res) => {
  const feedbackData = req.body;
  const callBack = (err, data) => {
    if (!err) {
      res.send(data);
    } else {
      res.status(500).send(err);
    }
  };

  if (feedbackData.finished) {
    feedbackData.finished = undefined;
    Customer.findByIdAndUpdate(
      req.params._id,
      {
        $push: { feedbacks: feedbackData },
        $set: { finished: true }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      },
      callBack
    );
  } else {
    feedbackData.finished = undefined;
    Customer.findByIdAndUpdate(
      req.params._id,
      {
        $push: { feedbacks: feedbackData }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      },
      callBack
    );
  }
});

app.use('/api/auth/users', authRoutes);

app.get('*', (req, res) => {
  res.sendFile('index.html');
});

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
