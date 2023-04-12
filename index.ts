import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import PlotGenerator from "@xeserv/plottoriffic";
import { generateName } from "@kotofurumiya/th-namegen";
import * as fs from "node:fs/promises";

dotenv.config();

const dirName = `var/${generateName()}`;
await fs.mkdir(dirName, { recursive: true });
console.log(`dirName: ${dirName}`);

const pg = new PlotGenerator({ flipGenders: false });
const plot = pg.generate();

await fs.writeFile(`${dirName}/plotto.json`, JSON.stringify(plot));

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

plot.cast.forEach(async (ch) => {});

const promptBase = `Write me the following about the following plot summary for a novel:

- A two word title for the novel starting with "Title: " and followed by two newlines.
- A detailed plot summary for the story starting with "Plot Summary: " and followed by two newlines.
- The string "Chapter Summaries" followed by two newlines.
- A markdown list of detailed chapter summaries in at least 3 sentences and titles for each of the 10 chapters that a novel based on the plot summary would have. Surround each chapter title in quotes and put a dash after the name like this: "Chapter name" - Chapter summary goes here.`;

const summary = await openai.createChatCompletion({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "user",
      content: promptBase + "\n\n" + plot.plot,
    },
  ],
});

if (!!summary.data.usage) {
  const usage = summary.data.usage;
  console.log(
    `${usage.total_tokens} tokens (${usage.prompt_tokens} prompt, ${usage?.completion_tokens} completion)`
  );
}

console.log(summary.data.choices[0].message?.content);
await fs.writeFile(`${dirName}/summary.txt`, summary.data.choices[0].message?.content as string);
