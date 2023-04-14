import * as fs from "node:fs/promises";
import { OpenAIApi } from "openai";
import PlotGenerator, { Plot } from "@xeserv/plottoriffic";

export interface ChapterListItem {
  title: string;
  summary: string;
}

export interface Chapter extends ChapterListItem {
  sceneDescriptions: string[];
}

export interface Character {
  name: string;
  symbol: string;
  role: string;
  desc: string;
}

export interface Summary {
  title: string;
  chapterList: ChapterListItem[];
  plotSummary: string;
  characters: Character[];
}

export const createPlot = async (dirName: string): Promise<Plot> => {
  const pg = new PlotGenerator({ flipGenders: false });
  const plot = pg.generate();

  await fs.writeFile(`${dirName}/plotto.json`, JSON.stringify(plot));

  return plot;
};

export const createAndParseSummary = async (
  dirName: string,
  openai: OpenAIApi,
  plot: Plot
): Promise<Summary> => {
  console.log("generating plot summary");
  const promptBase = `Write me the following about the following plot summary for a novel:

- A two to five word title for the novel starting with "Title: " and followed by two newlines. For example: "Fresh Beginnings" or "Jared's Adventure through Crime".
- A detailed plot summary for the story starting with "Plot Summary: " and followed by two newlines. The plot summary should be on the same line as the prefix. Adapt the story to be about peer to peer networks somehow.
- The string "Chapter Summaries" followed by two newlines.
- A markdown list of detailed chapter summaries in at least 3 sentences and titles for each of the 10 chapters that a novel based on the plot summary would have. Surround each chapter title in quotes and put a dash after the name like this:

- Chapter name - Chapter summary goes here. More words in the summary go here.
- Second chapter name - Second chapter summary goes here.`;

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

  const summaryText = summary.data.choices[0].message?.content;

  await fs.writeFile(`${dirName}/summary.txt`, summaryText as string);

  const titleRegex = /^Title: (.+)$/gm;
  const plotSummaryRegex = /^Plot Summary: (.+)$/gm;
  const chapterSummaryRegex = /^- (.+) - (.+)$/gm;

  let title = summaryText?.split("\n", 2)[0].split(titleRegex)[1] as string;

  if (title[0] === '"') {
    title = title.slice(1, -1);
  }
  console.log(`title: ${title}`);

  const chapterList: ChapterListItem[] = summaryText
    ?.split("\n\n")
    .slice(-1)[0]
    .split("\n")
    .map((line) => {
      return line.split(chapterSummaryRegex);
    })
    .map((ch) => {
      ch.shift();
      ch.pop();
      return {
        title: ch[0].slice(1, -1) as string,
        summary: ch[1] as string,
      } as ChapterListItem;
    }) as ChapterListItem[];

  chapterList.forEach((ch) => console.log(`chapter ${ch.title}: ${ch.summary}`));

  const plotSummary = summaryText?.split("\n\n", 3)[1].split(plotSummaryRegex)[1] as string;
  console.log(`${plotSummary}`);

  const bookInfo: Summary = {
    title,
    chapterList,
    plotSummary,
    characters: [],
  };

  for (const ch of plot.cast) {
    console.log(ch);
    const prompt = `Given the following plot summary and character information, write a two-sentence summary of that character and create plausible character details and an appearance for them. Don't include anything but the summary. Adapt the character's story to be about peer to peer networks somehow.

  Plot summary: ${plotSummary}
  Character name: ${ch.name} (${ch.symbol})
  Character role: ${ch.description}`;

    console.log(`getting information for ${ch.name} (${ch.symbol} - ${ch.description})`);

    const chInfo = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const chInfoText = chInfo.data.choices[0].message?.content;
    console.log(`${ch.name}: ${chInfoText}`);

    bookInfo.characters.push({
      name: ch.name,
      symbol: ch.symbol,
      role: ch.description,
      desc: chInfoText as string,
    });
  }

  await fs.writeFile(`${dirName}/summary.json`, JSON.stringify(bookInfo));

  return bookInfo;
};
