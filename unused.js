const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
dotenv.config();
console.log('eeiei');
const configuration = new Configuration({
  apiKey: process.env.APIKEY,
});
const openai = new OpenAIApi(configuration);

app.use(bodyParser.json());

app.post("/api/chat", async (req, res) => {
  const prompt = req.body.prompt;
  const model = req.body.model || "text-davinci-003";

  try {
    // const response = await openai.createCompletion({
    //   model: model,
    //   prompt: prompt,
    //   temperature: 0.7,
    //   max_tokens: 300,
    // });
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const message = response.data.choices[0].message.content.trim();
    res.json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
