const express = require('express');
const app = express();
const mysql = require('mysql');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();


const port = process.env.PORT || 3000;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const database = process.env.DATABASE;
console.log(dbHost);
console.log(dbUser);
console.log(dbPassword);
console.log(port);
console.log(database);


app.use(express.static('public'));
app.use(express.urlencoded({extended:false}));
app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false
  })
);

app.use((req,res,next) => {
  if (req.session.userId === undefined) {
    res.locals.username = 'ゲスト';
    res.locals.isLoggedIn = false;
  } else {
    res.locals.username = req.session.username;
    res.locals.isLoggedIn =true;
  }
  next();
});

const connection = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: database
});

app.get('/',(req,res) => {
  res.render('top.ejs');
});

app.get('/list',(req,res) => {

  connection.query(
    'SELECT * FROM articles',
    (error,results) => {
      res.render('list.ejs',{articles:results});
    }
  );
});

app.get('/article/:id',(req,res) => {
  const id = req.params.id;
  connection.query(
    'SELECT * FROM articles WHERE id = ?',
    [id],
    (error,results) => {
      res.render('article.ejs',{article:results[0]});
    }
  )
});

app.get('/signup',(req,res) => {
  res.render('signup.ejs',{errors:[]});
});

app.post('/signup',
(req,res,next) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const errors= [];

  if(username === "") {
    errors.push('ユーザー名が空です');
  }
  if (email === "") {
    errors.push('メールアドレスが空です');
  }
  if (password === "") {
    errors.push('パスワードが空です');
  }

  if(errors.length > 0) {
    res.render('signup.ejs',{errors:errors});
  }else {
    next();
  }
},
(req,res,next) => {
  const email = req.body.email;
  const errors = [];
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error,results) =>{
      if(results.length > 0){
        errors.push('ユーザー登録に失敗しました');
        res.render('signup.ejs',{errors:errors});
      }else {
        next();
      }
    }
  );
},
(req,res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  bcrypt.hash(password,10,(error,hash) => {
    connection.query(
      'INSERT INTO users (username,email,password) VALUES (?, ?, ?)',
      [username, email, hash],
      (error, results) => {
        req.session.userId = results.insertId;
        req.session.username = req.body.username;
        res.redirect('/list');
      }
    );
  })


});


app.get('/login',(req,res) => {
  res.render('login.ejs');
});

app.post('/login',(req,res) => {
  const email = req.body.email;
  connection.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error,results) => {
      if (results.length > 0) {
      const plain = req.body.password;
      const hash = results[0].password;

      bcrypt.compare(plain,hash,(error,isEqual) => {
        if(isEqual) {
          req.session.userId = results[0].id;
          req.session.username = results[0].username;
          res.redirect('/list');
        }else {
          res.redirect('/login');
        }
      });

      }else {
        res.redirect('/login');
      }

    }
  );
});

app.get('/logout',(req,res) => {
  req.session.destroy((error) => {
    res.redirect('/list');
  });
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
