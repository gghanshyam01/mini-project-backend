// @ts-check
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { mongooseOptions, URL } = require("./configs/mongoose.config");
const mongoose = require("mongoose");
const { User } = require("./models/user");
const { authenticate } = require("./middlewares/authenticate");
mongoose.set("useCreateIndex", true);

// @ts-ignore
mongoose
  .connect(
    URL,
    mongooseOptions
  )
  .then(res => console.debug("Connected to MongoDB"))
  .catch(err => console.debug("Error while connecting to MongoDB"));

const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

const loginUser = (req, res) => {
  const user = req.body;
  // @ts-ignore
  User.findByCredentials(user.email, user.password)
    .then(user => {
      return user.generateAuthToken();
    })
    .then(token => {
      res.cookie("SESSIONID", token, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 10,
        secure: false
      });
      res.send({ token, expiresIn: "1 day" });
    })
    .catch(err =>
      res.status(400).send({
        error: "Email or password incorrect"
      })
    );
};

const registerUser = (req, res) => {
  const user = new User(req.body);
  // user
  //   .save()
  //   .then(user => {
  //     return user.generateAuthToken();
  //   })
  let tokenReturned = "";
  user
    .generateAuthToken()
    .then(token => {
      tokenReturned = token;
      return user.save();
    })
    .then(() => {
      res.cookie("SESSIONID", tokenReturned, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 10, // 10 hr
        secure: false
      });
      res.send({ token: tokenReturned, expiresIn: "10h" });
    })
    .catch(err => res.status(400).send(err));
};

app.get("/api/users/me", authenticate, (req, res) => {
  // @ts-ignore
  res.send(req.user);
});

app.post("/api/auth/users/register", registerUser);

app.post("/api/auth/users/login", loginUser);

app.listen(PORT, () => console.log(`Server up on port ${PORT}`));
