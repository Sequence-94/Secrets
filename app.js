//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
//const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();


app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//connect
main().catch(err => console.log(err));
async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/userDB");
}

//make schema and model
// const userSchema = {
//     email: String,
//     password: String
// };
//created from mongoose Schema class
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
//hash and salt and save our users into mongodb database
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// console.log(process.env.API_KEY);
// const secret = "Thisisourlittlesecret.";
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
//console.log(md5("123456"));
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    //userProfileURL: "http://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {

        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.route("/secrets")
    .get(function (req, res) {
        // if (req.isAuthenticated()) {
        //     res.render("secrets");
        // } else {
        //     res.redirect("/login");
        // }
        User.find({ "secret": { $ne: null } })
            .then(function (foundUser) {
                res.render("secrets", { usersWithSecrets: foundUser });
            })
            .catch(function (err) {
                console.log(err);
            })
    });

app.get("/", function (req, res) {
    res.render("home");
});
// app.get("/login", function (req, res) {
//     res.render("login");
// });

app.route("/auth/google")
    .get(passport.authenticate("google", { scope: ["profile"] }));

app.route("/auth/google/secrets")
    .get(passport.authenticate("google", { failureRedirect: "/login " }),
        function (req, res) {
            // Successful authentication, redirect home.
            res.redirect("/secrets");
        });

app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        // const username = req.body.username;
        // const password = req.body.password;

        // User.findOne({ email: username })
        //     .then(function (foundUser) {
        //         //req.body.password is turned into a hash and compares it to the hash passed during registration
        //         if (bcrypt.compareSync(req.body.password, foundUser.password)) {
        //             res.render("secrets");
        //         }
        //     })
        //     .catch(function (err) {
        //         console.log(err);
        //     })

        const user = new User({
            username: req.body.username,
            password: req.body.password
        })

        req.login(user, function (err) {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                })
            }
        })


    });

// app.get("/register", function (req, res) {
//     res.render("register");
// });

app.route("/register")
    .get(function (req, res) {
        res.render("register");
    })
    .post(function (req, res) {

        // const hash = bcrypt.hashSync(req.body.password, saltRounds);
        // // Store hash in your password DB.

        // const newUser = new User({
        //     email: req.body.username,
        //     password: hash
        // });
        // newUser.save()
        //     .then(function () {
        //         res.render("secrets");
        //     })
        //     .catch(function (err) {
        //         console.log(err);
        //     })


        User.register({ username: req.body.username }, req.body.password)
            .then(function (user) {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                })
            })
            .catch(function (err) {
                console.log(err);
                res.redirect("/register");
            })
    });

app.route("/submit")
    .get(function (req, res) {
        if (req.isAuthenticated) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post(function (req, res) {
        const submittedSecret = req.body.secret;

        User.findById(req.user.id)
            .then(function (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save()
                    .then(function () {
                        res.redirect("/secrets");
                    })
                    .catch(function (error) {
                        console.error(error);
                    })
            })
            .catch(function (err) {
                console.log(err);
            })
    });


app.route("/logout")
    .get(function (req, res) {
        req.logout(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.redirect("/");
            }
        });

    })



app.listen(3000, function () {
    console.log("Server started on port 3000");
});