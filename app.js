const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { sequelize } = require('./db/models');
const session = require('express-session');
const { sessionSecret } = require('./config');
const { restoreUser } = require('./auth');
const { csrfProtection, asyncHandler } = require('./routes/utils');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { Op } = require('sequelize');

const db = require('./db/models');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const groupsRouter = require('./routes/groups');
const tasksRouter = require('./routes/tasks');
const subTasksRouter = require('./routes/sub-tasks');

const app = express();

// view engine setup
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(sessionSecret));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('/images'));

// set up session middleware
const store = new SequelizeStore({ db: sequelize });

app.use(
  session({
    secret: sessionSecret,
    store,
    saveUninitialized: false,
    resave: false,
  })
);

// create Session table if it doesn't already exist
store.sync();

// comment out routes that are not being worked on
app.use(restoreUser);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/users', groupsRouter);
app.use('/users', tasksRouter);
app.use('/users', subTasksRouter);
app.get(
  /(.*?)/,
  asyncHandler(async (req, res) => {
    if (req.session.auth) {
      const owner_id = req.session.auth.userId;
      let dashboard = await db.group.findOne({
        where: {
          [Op.and]: [{ owner_id }, { dashboard: true }],
        },
      });
      return res.redirect(`/users/${owner_id}/${dashboard.id}`);
    }
    return res.redirect('/');
  })
);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
