// Packages
const express = require("express");
const http = require("http");
const mongo = require("mongodb");
const Twit = require("twit");

// Configs
const app = express();
const server = http.createServer(app); // with this, we can get the server on a variable and use in other places (like socket).
/* the same can be get using:
 server = app.listen(PORT) */

const io = require("socket.io").listen(server);
const MongoClient = mongo.MongoClient;
require("dotenv").config({ path: "./variables.env" });

// -------------------------------------------------

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

// index file to see twitts stream
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

const T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// // Sockets.io connection
io.sockets.on("connection", socket => {
	console.log("Connection ready")
  const stream = T.stream("statuses/filter", {
    track: ["node", "reactjs", "js"]
  });

  // when I get a new tweet
  stream.on("tweet", tweet => {
    io.sockets.emit(
      "stream",
      tweet.user.profile_image_url +
        "," +
        tweet.created_at +
        "," +
        tweet.id +
        "," +
        tweet.text +
        ", @" +
        tweet.user.screen_name
    );

    // send text to database
    MongoClient.connect(process.env.DB_URL, (err, db) => {
      if (err) throw err;

      const dbo = db.db(process.env.DB_NAME);
      const myobj = {
        tweet_id: tweet.id,
        tweet: tweet.text,
        twitter_handle_image: tweet.user.profile_image_url,
        twitter_handle: tweet.user.screen_name,
        created_at: tweet.created_at
			};
			// console.log(tweet.text)
      dbo.collection("tweets").insertOne(myobj, (err, res) => {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
      });
    });
  });
});
