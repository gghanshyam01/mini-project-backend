const jwt = require('jsonwebtoken');


token = jwt.sign({
    id: 1,
    access: 'auth'
}, 'abc123');

console.log(token);