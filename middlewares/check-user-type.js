const shouldBeAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res
      .status(403)
      .send('You does not seem to be the right user to perform this action.');
  }
  next();
};

const shouldBeUser = (req, res, next) => {
  if (req.user.isAdmin) {
    return res
      .status(403)
      .send('You does not seem to be the right user to perform this action.');
  }
  next();
};

module.exports = { shouldBeAdmin, shouldBeUser };
