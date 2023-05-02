//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();


app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


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
    password: String
});
console.log(process.env.API_KEY);
// const secret = "Thisisourlittlesecret.";
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
    res.render("home");
});
// app.get("/login", function (req, res) {
//     res.render("login");
// });
app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const username = req.body.username;
        const password = req.body.password;

        User.findOne({ email: username })
            .then(function (foundUser) {
                if (foundUser.password === password) {
                    res.render("secrets");
                }
            })
            .catch(function (err) {
                console.log(err);
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
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        newUser.save()
            .then(function () {
                res.render("secrets");
            })
            .catch(function (err) {
                console.log(err);
            })
    });






app.listen(3000, function () {
    console.log("Server started on port 3000");
});