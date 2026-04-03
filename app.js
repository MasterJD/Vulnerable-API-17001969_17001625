var express = require('express');
var session = require('express-session')
var expressLayouts = require('express-ejs-layouts');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require("fs");
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var log4js = require("log4js");

var init_db = require('./model/init_db');
var login = require('./routes/login');
var products = require('./routes/products');

var app = express();

// config second logger
log4js.configure({
  appenders: {
    file: { type: 'file', filename: 'app-custom.log' }
  },
  categories: {
    default: { appenders: ['file'], level: 'info' },
    vnode: { appenders: ['file'], level: 'info' }
  }
});

var logger4js = log4js.getLogger('vnode');

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'))

/*
 * Template engine
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// uncomment after placing your favicon in /public
app.use(logger('combined', {stream: accessLogStream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'ñasddfilhpaf78h78032h780g780fg780asg780dsbovncubuyvqy',
  cookie: {
    secure: false,
    maxAge: 99999999999
  }
}));

app.use(function(req, res, next) {
  res.locals.currentUser = req.session && req.session.user_name ? req.session.user_name : null;
  next();
});

/*
 * Routes config
 */
app.use('', products);
app.use('', login);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/*
 * Debug functions and error handlers
 */
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      layout: 'layout-login',
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    layout: 'layout-login',
    message: err.message,
    error: {}
  });
});

/*
 * Create database
 */
logger4js.info("Building database")
// logger.info(("Building database");

init_db();

module.exports = app;
