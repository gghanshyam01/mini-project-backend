const { User } = require('./../models/user');

const authenticate = (req, res, next) => {
    const token = req.cookies;
    // @ts-ignore
    User.findByToken(token).then((user) => {
        if (!user) {
            return Promise.reject();
        }
        req.user = user;
        req.token = token.SESSIONID;
        next();
    }).catch((e) => res.status(401).send());
};

module.exports = { authenticate };