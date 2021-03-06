const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
// User Model
const User = require('../models/user.js');

const salt = 13;

// Login handler
router.get('/login', (req, res) => {
	res.render('login');
})
router.get('/register', (req, res) => {
	res.render('register');
})

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
	service: 'GMAIL',
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS
	}
})

// Register handler
router.post('/register', (req, res) => {
	console.log(req.body);
	const { name, email, password, password2 } = req.body;
	// Array of errors
	let errors = [];
	console.log(`Name: ${name}\nEmail: ${email}\nPass: ${password}`);

	if (!name || !email || !password ||  !password2) {
		errors.push({ msg: 'Please fill in all the fields' });
	} 

	// Check if both passwords match
	if (password !== password2) {
		errors.push({ msg: 'Passwords does not match' });
	}

	// Check if password is more than 5 charcayers
	if (password.length < 5) {
		errors.push({ msg: 'Password must be of atleast 5 characters long' });
	}

	if (errors.length > 0) {
		res.render('register', { errors, name, email, password, password2 });
	} else {
		// validation passed
		User.findOne({email: email}).exec((err, user) => {
			console.log(user);
			if (user) {
				console.log("EMAIL EXISTS")
				errors.push({ msg: 'Email already registered' });
				res.render('register', { errors });
			} else {
				const newUser = new User( {
					name,
					email,
					password 
				})
				// Async Email
				jwt.sign(
					{user: newUser.email},
					process.env.EMAIL_SECRET,
					{expiresIn: '1d'},
					(err, emailToken) => {
						if (err) throw new Error(err);
						const url = `http://localhost:3000/confirmation/${emailToken}`;
						console.log('SENDIMG EMAIL TO: ' + newUser.email);
						transporter.sendMail({
							to: newUser.email,
							subject: 'Confirm Email',
							html: `Please click this email to confirm your email <br>` +
									`<a href="${url}">${url}</a>`
						})
					}
				)
				// Hash the password
				bcrypt.hash(newUser.password, salt, (err, hash) => {
					if (err) throw err;
					// save pass to hash
					newUser.password = hash;
					newUser.save()
						.then(value => {
							console.log(value);
							req.flash('success_msg', 'Success! Check your email for confirmation link');
							res.redirect('/users/login');
						})
						.catch(err => console.log(err));
				})


			}
		})
	}

});

router.post('/login', (req, res, next) => {
	passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/users/login',
		failureFlash: true
	})(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
	req.logout();
	req.flash('success_msg', "Now logged out");
	res.redirect('/users/login');
});

module.exports = router;