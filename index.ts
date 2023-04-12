import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import PlotGenerator from "@xeserv/plottoriffic";

dotenv.config();

const pg = new PlotGenerator({});
const plot = pg.generate();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const completion = await openai.createChatCompletion({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "user",
      content: "Write me a plot summary for the following story:\n\n" + plot.plot,
    },
  ],
});
console.log(completion.data.choices[0].message);
