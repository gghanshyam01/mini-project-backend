
const express = require('express');
const app = express();

app.get('justatest', (req, res, next) => {
    next();
});