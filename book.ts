import * as fs from "node:fs/promises";
import { ChatCompletionRequestMessage, OpenAIApi } from "openai";
import PlotGenerator, { Plot } from "@xeserv/plottoriffic";

export const authorBio = `Yasomi Midori is a science fiction author who explores the themes of identity, memory, and technology in her novels. Her debut novel “The Memory Thief” was a critically acclaimed bestseller that captivated readers with its thrilling plot and complex characters. Yasomi also contributes to the Xe Iaso blog as the character Mimi, a hacker and activist who exposes the secrets of the powerful corporations that control the world. Yasomi was born and raised in Tokyo, Japan, where she developed a passion for reading and writing at an early age. She studied computer science and literature at the University of Tokyo, and worked as a software engineer before becoming a full-time writer. She lives in Kyoto with her husband and two cats.`;

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
  const promptBase = [
    "You are a Novel generation AI, write plot summaries for novels given a specified format.",
    '- A two two five word novel title in the format of "Title: " followed by two newlines. (Examples: "Fresh Beginnings", "Jared\'s Adventure")',
    '- A detailed plot summary in the format of "Plot Summary: " followed by two newlines. The story MUST relate to peer to peer networks.',
    '- A section titled "Chapter Summaries:" followed by two newlines which will follow a specified structure.',
    "\t- A markdown style list of very detailed summaries of each chapter. Each must be 3 sentences and have a title for each chapter. There MUST be 15 chapters. Each chapter must tie in to the overaching plot summary. They should follow a specified format.",
    '\t\t- Each chapter section should be in the format of "Chapter Name: Chapter summary." followed with a single newline.',
  ];

  /* Create the messages array */
  var messages: Array<ChatCompletionRequestMessage> = new Array<ChatCompletionRequestMessage>();

  const promptObject: ChatCompletionRequestMessage = {
    role: "user",
    content: `${plot.plot}`,
  };

  /* Push the messages into the array */
  promptBase.map((message) => {
    const systemObject: ChatCompletionRequestMessage = {
      role: "system",
      content: `${message}`,
    };

    messages.push(systemObject);
  });

  messages.push(promptObject);

  const summary = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
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
  const chapterSummaryRegex = /^- (.+) ?- (.+)$/gm;

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
    bookInfo.characters.push({
      name: ch.name,
      symbol: ch.symbol,
      role: ch.description,
      desc: "",
    });
  }

  await fs.writeFile(`${dirName}/summary.json`, JSON.stringify(bookInfo));

  return bookInfo;
};

export const createChapterScenes = async (
  dirName: string,
  openai: OpenAIApi,
  summary: Summary,
  ch: ChapterListItem
): Promise<Chapter> => {
  console.log(`creating chapter scene information for chapter ${ch.title}`);

  const prompt =
    `Given the following plot summary, character information, and chapter information, write descriptions of scenes that would happen in that chapter. End each description with two newlines. Write at least 4 scenes. DO NOT only write one scene. Use detail and be creative. DO NOT include the chapter title in your output. ONLY output the scenes separated by newlines like this.

What happens first.

What happens after that.

Plot summary: ${summary.plotSummary}
Character information:
` +
    summary.characters.map((char) => `- ${char.name}: ${char.role}`).join("\n") +
    `
Chapter title: ${ch.title}
Chapter summary: ${ch.summary}`;

  const chInfo = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const chInfoText = chInfo.data.choices[0].message?.content as string;

  return {
    title: ch.title,
    summary: ch.summary,
    sceneDescriptions: chInfoText.split("\n\n"),
  };
};

const getLastLine = (str: string): string => {
  const lastLineIndex = str.lastIndexOf("\n");
  if (lastLineIndex === -1) {
    return str;
  } else {
    return str.slice(lastLineIndex + 1);
  }
};

// https://pandoc.org/epub.html
export const writeChapterScene = async (
  dirName: string,
  openai: OpenAIApi,
  summary: Summary,
  ch: Chapter,
  chNum: number,
  sceneNum: number,
  scene: string
): Promise<string> => {
  const prompt =
    `Given the following information, write the scene of the novel. Be detailed about the setting and character descriptions. End each paragraph with two newlines. Write many sentences. ONLY return the text of the novel.
` +
    summary.characters.map((char) => `- ${char.name}: ${char.role}`).join("\n") +
    `
Chapter title: ${ch.title}
Chapter summary: ${ch.summary}
Scene summary: ${scene} ${
      chNum == 1 && sceneNum == 1
        ? "\nWrite details about what the character in the scene and their environment looks like."
        : ""
    }`;

  let sceneInfo = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  let prose = sceneInfo.data.choices[0].message?.content as string;

  sceneInfo = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt,
      },
      {
        role: "assistant",
        content: getLastLine(prose),
      },
      {
        role: "user",
        content: "Continue writing the story.",
      },
    ],
  });

  prose = (prose + "\n\n" + sceneInfo.data.choices[0].message?.content) as string;

  const fname = `ch-${chNum}-sc-${sceneNum}.md`;

  await fs.writeFile(`${dirName}/src/${fname}`, prose);

  console.log(`wrote chapter ${chNum} scene ${sceneNum}`);

  return fname;
};
