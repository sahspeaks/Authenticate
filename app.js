//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const homeStartingContent = "Publish your passions, your way. Share your expertise, breaking news, or whatever’s on your mind";
const aboutContent = "Some secrets you just can’t share with the people you know. Maybe it’s because you’ve held on to one for so long that just the thought of revealing it now is absolutely unthinkable, or maybe you cannot bear the thought of having a person you care about think differently of you. But sharing them can be a therapeutic experience, even if it is anonymously, and with strangers on the Internet .But You need not to worry,Anonymous Posts is made for you.Share your secrets anonymously.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: "My lil secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://Abhi_speaks:Abhisheksvce@cluster1.azd3xp2.mongodb.net/PostsDB", { useNewUrlParser: true });


const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
const postSchema = new mongoose.Schema({
  title: String,
  content: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  function (accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })

);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/welcome');
  })

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/welcome", (req, res) => {
  Post.find({ secret: { $ne: null } }, (err, posts) => {
    if (err) {
      console.log(err);
    } else {
      if (req.isAuthenticated()) {
        res.render("welcome", {
          startingContent: homeStartingContent,
          posts: posts
        });
      } else {
        res.redirect("/login");
      }
    }
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});


app.post("/register", (req, res) => {

  User.register({ username: req.body.username }, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/login");
      });
    }
  });
});

app.post("/login", (req, res) => {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/welcome");
      });
    }
  });
});


app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }

});

app.post("/compose", function (req, res) {

  if (req.isAuthenticated()) {

    const post = new Post({
      title: req.body.postTitle,
      content: req.body.postBody
    });


    post.save(function (err) {
      if (!err) {
        res.redirect("/welcome");
      }
    });
  } else {
    res.redirect("/login");
  }

});


app.get("/posts/:postId", function (req, res) {

  if (req.isAuthenticated()) {
    const requestedPostId = req.params.postId;
    const delbuttonId = req.body.delbutton;


    Post.findOne({ _id: requestedPostId }, function (err, post) {
      res.render("post", {
        title: post.title,
        content: post.content
      });
    });
  } else {
    res.redirect("/login");
  }

});

app.post("/delete", (req, res) => {

  const delbuttonName = (req.body.delbutton);

  console.log(delbuttonName);
  Post.findOneAndRemove({ title: delbuttonName }, function (err, doc) {
    if (!err) {
      console.log("Successfully removed document");
      res.redirect("/welcome");
    }
    else {
      console.log(err);
    }
  });
});


app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/https://accounts.google.com/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("https://accounts.google.com/logout")
    }
  });
});



app.get("/about", function (req, res) {
  res.render("about", { aboutContent: aboutContent });
});

app.get("/contact", function (req, res) {
  res.render("contact", { contactContent: contactContent });
});



let port=process.env.PORT;
if(port==null || port==""){
  port=3000;
}
app.listen(port, () => {
  console.log("Server started at port 3000");
});