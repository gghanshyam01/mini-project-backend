// @ts-check
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { mongooseOptions, URL } = require('./configs/mongoose.config');
const mongoose = require('mongoose');
const { User } = require('./models/user');
const { authenticate } = require('./middlewares/authenticate');
mongoose.set('useCreateIndex', true);

// @ts-ignore
mongoose.connect(URL, mongooseOptions)
    .then(res => console.debug('Connected to MongoDB'))
    .catch(err => console.debug('Error while connecting to MongoDB'));

const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan('dev'));

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

const registerUser = (req, res) => {
    const user = new User(req.body);
    user.save()
        .then(() => {
            return user.generateAuthToken();
        }).then(token => {
            res.cookie('SESSIONID', token, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24, secure: false });
            res.send({ token, expiresIn: '1 day' });
        })
        .catch(err => res.status(400).send(err));
};

app.get('/api/users/me', authenticate, (req, res) => {
    // @ts-ignore
    res.send(req.user);
});
app.post('/api/auth/users', registerUser);
app.listen(PORT, () => console.log(`Server up on port ${PORT}`));