const https = require("https");
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./db");
const mongoose = require("mongoose");
const langdetect = require("langdetect");

app.use(cors());
dotenv.config();

// connect to mongo
connectDB();

const dictationsSchema = new mongoose.Schema(
  {
    ko: { type: String },
    th: { type: String },
    en: { type: String },
    example: { type: String },
  },
  { versionKey: false }
);

const dictations = mongoose.model("dictations", dictationsSchema);

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

app.get("/", async (req, res) => {
  res.sendStatus(200);
});

app.post("/test", async (req, res) => {
  try {
    const lan = langdetect.detect(req.body.word);
    const filterLanguage = lan[0].lang === "th" ? "th" : "ko";
    const filter = {
      [filterLanguage]: req.body.word,
    };
    const dict = await dictations.find(filter);
    console.log(dict);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
  }
});

app.get("/list", async (req, res) => {
  try {
    const dict = await dictations.find({});
    const response = {
      data: dict,
    };

    res.send(response);
  } catch (error) {
    console.error(error);
  }
});

app.post("/webhook", async (req, res) => {
  res.send("HTTP POST request sent to the webhook URL!");
  // If the user sends a message to your bot, send a reply message
  if (req.body.events[0].type === "message") {
    // Message data, must be stringified

    const prompt = req.body.events[0].message.text;
    const firstletter = prompt.charAt(0);
    try {
      let messages = [];
      if (firstletter === "?") {
        const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt.substring(1),
            },
          ],
        });

        messages = [
          {
            type: "text",
            text: response.data.choices[0].message.content.trim(),
          },
        ];
      } else if (firstletter === "+") {
        word = prompt.split("/");

        await dictations.create({
          ko: word[1],
          th: word[2],
          en: word[3],
          example: "",
        });

        messages = [
          {
            type: "text",
            text: "Add data success.",
          },
        ];
      } else {
        const lan = langdetect.detect(prompt);

        let filterLang = "en";

        if (lan[0].lang === "ko" || lan[0].lang === "th") {
          filterLang = lan[0].lang;
        }

        const filter = {
          [filterLang]: prompt,
        };
        const dict = await dictations.findOne(filter);
        const message = `find ${prompt} \n ------ \n th: ${dict.th} \n ko: ${dict.ko} \n en: ${dict.en}`;

        let example = dict.example;

        if (dict.example === "") {
          const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: `Example 3 korean sentence that use ${dict.ko} and translate to english and thai.`,
              },
            ],
          });

          example = response.data.choices[0].message.content.trim();
          await dictations.findByIdAndUpdate(
            { _id: dict._id },
            { example: example }
          );
        }

        messages = [
          {
            type: "text",
            text: message,
          },
          {
            type: "text",
            text: example,
          },
        ];
      }

      const dataString = JSON.stringify({
        replyToken: req.body.events[0].replyToken,
        messages: messages,
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
