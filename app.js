const https = require("https");
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const TOKEN = process.env.TOKEN;
const configuration = new Configuration({
  apiKey: process.env.APIKEY,
});
const openai = new OpenAIApi(configuration);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

app.post("/webhook", async (req, res) => {
  res.send("HTTP POST request sent to the webhook URL!");
  // If the user sends a message to your bot, send a reply message
  if (req.body.events[0].type === "message") {
    // Message data, must be stringified

    const prompt = req.body.events[0].message.text;
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}],
      });

      const message = response.data.choices[0].message.content.trim();

      const dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      });

      // Request header
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + TOKEN,
      };

      // Options to pass into the request
      const webhookOptions = {
        hostname: "api.line.me",
        path: "/v2/bot/message/reply",
        method: "POST",
        headers: headers,
        body: dataString,
      };

      // Define request
      const request = https.request(webhookOptions, (res) => {
        res.on("data", (d) => {
          process.stdout.write(d);
        });
      });

      // Handle error
      request.on("error", (err) => {
        console.error(err);
      });

      // Send data
      request.write(dataString);
      request.end();
    } catch (error) {
      console.error(error);
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
