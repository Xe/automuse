import { Command } from "commander";
import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import OpenAI from "openai";
import { readPackage } from "read-pkg";
import PlotGenerator from "@ebooks/plottoriffic";
import catches from "./additional_catches.json" assert { type: "json" };
import { sleep } from "openai/core";
import { faker } from "@faker-js/faker";
import { execa } from "execa";
import { createWriteStream } from "node:fs";

dotenv.config();
const packageInfo = await readPackage();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const program = new Command();

const authorBio = `Midori Yasomi is a science fiction author who explores the themes of identity, memory, and technology in her novels. Her debut novel “Network Stranded” was a critically acclaimed bestseller that captivated readers with its thrilling plot and complex characters. Yasomi also contributes to the Xe Iaso blog as the character Mimi, a hacker and activist who exposes the secrets of the powerful corporations that control the world. Yasomi was born and raised in Tokyo, Japan, where she developed a passion for reading and writing at an early age. She studied computer science and literature at the University of Tokyo, and worked as a software engineer before becoming a full-time writer. She lives in Kyoto with her husband and two cats.`;

const systemPrompt = {
  base: `You are a writer working on a novel. Your goal is to write an award winning novel.`,
  summary: (
    subject
  ) => `Your job is to write the summary of a book's plot when given the description. You will output:
    
- A two to five word title for the novel starting with "Title: " and followed by two newlines. For example: "Fresh Beginnings" or "Jared's Adventure through Crime".
- A detailed plot summary for the story starting with "Plot Summary: " and followed by two newlines. The plot summary should be on the same line as the prefix. The story should be set ${subject}
- The string "Chapter Summaries" followed by two newlines.
- A markdown list of detailed chapter summaries in at least 3 sentences and titles for each of the 15 chapters that a novel based on the plot summary would have. Surround each chapter title in quotes and put a dash after the name like this:
    
- Chapter name - Chapter summary goes here. More words in the summary go here.
- Second chapter name - Second chapter summary goes here.`,
  characterInfo: (
    character
  ) => `Your job is to write a short two paragraph description of a character when given the character's name and details. You will output information about the demographics of the character and any visual information that would be useful for a reader.

Character name: ${character.name} (${faker.person.sex()}, ${faker.person.gender()})
Plot role: ${character.description}
Job: ${faker.person.jobTitle()}`,

  proseSystem: (characters = [], plotSummary, plot, title) => `${
    systemPrompt.base
  } You are writing individual scenes for the ${plot.subject} ${
    plot.setting
  } novel named "${title}". You will be given a description of a scene and you will write the prose for the scene. You will output the prose for the scene.
    
The plot summary of the book is:

${plotSummary.summary}

The characters in the book are:

${characters.map((ch) => `${ch.name}\n\n${ch.description}`).join("\n\n")}

Include realistic dialogue. Be creative and descriptive. Use a lot of detail. Write something that has an outstanding plotline, engaging characters and unexpected climaxes`,
  prose: (sceneInfo) => sceneInfo,
};

async function readFiles(directory) {
  let files = await fs.readdir(directory);
  let fileData = [];

  for (let file of files) {
    let content = await fs.readFile(path.join(directory, file), "utf8");
    fileData.push({ filename: path.basename(file, path.extname(file)), content: content });
  }

  return fileData.sort((a, b) => a.filename - b.filename);
}

program.name(packageInfo.name).description(packageInfo.description).version(packageInfo.version);

program
  .command("init")
  .description("Initialize the project")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    console.log(options);
    await fs.mkdir(options.dir, { recursive: true });
    await fs.mkdir(`${options.dir}/src`, { recursive: true });
    await fs.mkdir(`${options.dir}/threads`, { recursive: true });
    await fs.mkdir(`${options.dir}/characters`, { recursive: true });
    await fs.mkdir(`${options.dir}/chapters`, { recursive: true });
    await fs.writeFile(
      `${options.dir}/.gitignore`,
      `# Ignore everything in this directory\n*\n# Except this file\n!.gitignore`
    );
    console.log("Initialized project: " + options.dir);
  });

program
  .command("openai:models")
  .description("List the OpenAI models this account has access to")
  .action(async (options) => {
    console.table((await openai.models.list()).data);
  });

program
  .command("assistants:create")
  .description("Create the OpenAI assistants that will be used for novel generation")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .option("-p, --plotto-file <plottoFile>", "the plotto plot JSON file", "plot.json")
  .action(async (options) => {
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plottoFile}`));
    const assistant = await openai.beta.assistants.create({
      instructions: `${systemPrompt.base} You will be writing a book based on the following plot description:\n\n${plot.plot}`,
      name: `Automuse project ${options.dir}`,
      description: "An authorial assistant for writing novels",
      model: options.openaiModel,
      metadata: {
        dir: options.dir,
        automuseVersion: packageInfo.version,
        group: plot.group,
        subgroup: plot.subgroup,
        description: plot.description,
        setting: plot.setting,
      },
    });

    await fs.writeFile(`${options.dir}/assistant.json`, JSON.stringify(assistant, null, 2));

    console.log(`Created assistant ${assistant.id} and wrote to ${options.dir}/assistant.json`);
  });

program
  .command("plotto")
  .description("Generate a plot for your story")
  .option("--flip-genders", "flip genders?")
  .option("-p, --plotto-file <plottoFile>", "the plotto plot JSON file", "plot.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    const plotGenerator = new PlotGenerator({ flipGenders: options.flipGenders });
    const plot = plotGenerator.generate();
    const setting = catches[Math.floor(Math.random() * catches.length)];

    plot.plot += " " + setting;

    plot.setting = setting;
    console.log(plot);

    if (options.plottoFile) {
      await fs.writeFile(`${options.dir}/${options.plottoFile}`, JSON.stringify(plot, null, 2));
      console.log("Wrote plotto to " + options.plottoFile);
    }
  });

program
  .command("summary:generate")
  .description("Generate a summary for your story based on a plotto description")
  .option("-p, --plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    console.log(options);
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));
    const assistant = JSON.parse(await fs.readFile(`${options.dir}/assistant.json`));
    const metadata = assistant.metadata;

    const summaryRun = await openai.beta.threads.createAndRun({
      assistant_id: assistant.id,
      thread: {
        messages: [
          {
            role: "user",
            content: systemPrompt.summary(plot.setting),
          },
        ],
        metadata,
      },
      metadata,
    });

    await fs.writeFile(`${options.dir}/threads/summary.json`, JSON.stringify(summaryRun, null, 2));

    let status = { status: "running" };
    while (status.status !== "completed") {
      await sleep(1000);
      status = await openai.beta.threads.runs.retrieve(summaryRun.thread_id, summaryRun.id);
    }

    const threadMessages = await openai.beta.threads.messages.list(summaryRun.thread_id);
    console.log(threadMessages.data);
    await fs.writeFile(
      `${options.dir}/threads/summary_messages.json`,
      JSON.stringify(threadMessages.data, null, 2)
    );
  });

program
  .command("summary:parse")
  .description("Parse the summary generated by the summary:generate command")
  .option("-p, --plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("-s, --summary <summary>", "the summary JSON file", "summary.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    console.log(options);
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));
    const messages = JSON.parse(await fs.readFile(`${options.dir}/threads/summary_messages.json`));

    const assistantMessage = messages.find((message) => message.role === "assistant");
    const text = assistantMessage.content[0].text.value.split("\n\n");

    await fs.writeFile(`${options.dir}/summary.txt`, assistantMessage.content[0].text.value);

    const titleExtractionRegex = /^"(.*)"$/;
    const title = text[1].split(titleExtractionRegex)[1];

    const summary = text[3];

    console.log();

    const chapterSummaryExtractionRegex = /^- "(.*)" - (.*)$/;

    const chapterSummaries = text
      .slice(5)
      .join("")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((chapter) => {
        const chapterTitle = chapter.split(chapterSummaryExtractionRegex)[1];
        //console.log(chapter.split(chapterSummaryExtractionRegex));
        const chapterSummary = chapter.split(chapterSummaryExtractionRegex)[2];
        return {
          title: chapterTitle,
          summary: chapterSummary,
        };
      });

    const plotSummary = {
      title,
      summary,
      chapterSummaries,
      characters: plot.cast,
    };

    await fs.writeFile(`${options.dir}/${options.summary}`, JSON.stringify(plotSummary, null, 2));
  });

program
  .command("summary:characters")
  .description("Generate characters for your story based on a plotto description and summary")
  .option("-p, --plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("-s, --summary <summary>", "the summary JSON file", "summary.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    console.log(options);
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));
    const assistant = JSON.parse(await fs.readFile(`${options.dir}/assistant.json`));
    const metadata = assistant.metadata;

    const runs = [];

    for (const character of plot.cast) {
      const prompt = systemPrompt.characterInfo(character);

      const characterRun = await openai.beta.threads.createAndRun({
        assistant_id: assistant.id,
        thread: {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          metadata,
        },
        metadata,
      });
      console.log(`made run ${characterRun.id} for ${character.name} (${character.symbol})`);
      runs.push({ run: characterRun, character });
    }

    await fs.writeFile(`${options.dir}/threads/characters.json`, JSON.stringify(runs, null, 2));

    const resultMessages = [];

    for (const run of runs) {
      let status = { status: "running" };
      while (status.status !== "completed") {
        await sleep(1000);
        status = await openai.beta.threads.runs.retrieve(run.run.thread_id, run.run.id);
      }

      const threadMessages = await openai.beta.threads.messages.list(run.run.thread_id);
      console.log(threadMessages.data);
      await fs.writeFile(
        `${options.dir}/threads/characters_${run.character.symbol}_messages.json`,
        JSON.stringify(threadMessages.data, null, 2)
      );

      const assistantMessage = threadMessages.data.find((message) => message.role === "assistant");
      resultMessages.push({
        character: run.character,
        desc: assistantMessage.content[0].text.value,
      });
    }

    for (const message of resultMessages) {
      console.log(message.character.name);
      console.log(message.desc);

      await fs.writeFile(`${options.dir}/characters/${message.character.symbol}.md`, message.desc);
    }
  });

program
  .command("summary:chapters")
  .description(
    "Generate chapters for your story based on a plotto description and character summaries"
  )
  .option("-p, --plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("-s, --summary <summary>", "the summary JSON file", "summary.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .action(async (options) => {
    console.log(options);
    const summary = JSON.parse(await fs.readFile(`${options.dir}/${options.summary}`));
    const assistant = JSON.parse(await fs.readFile(`${options.dir}/assistant.json`));
    const metadata = assistant.metadata;

    const runs = [];

    for (const chapter in summary.chapterSummaries) {
      const prompt = `Write descriptions of scenes that would happen in that chapter. End each description with two newlines. Write at least 6 scenes. DO NOT only write one scene. Use detail and be creative. DO NOT include the chapter title in your output. ONLY output the scenes separated by newlines like this.

            What happens first.
            
            What happens after that.
            
            Write scene descriptions for this chapter: ${summary.chapterSummaries[chapter].title}.\n\n${summary.chapterSummaries[chapter].summary}`;

      const chapterRun = await openai.beta.threads.createAndRun({
        assistant_id: assistant.id,
        thread: {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          metadata,
        },
        metadata,
      });
      console.log(`made run ${chapterRun.id} for ${summary.chapterSummaries[chapter].title}`);
      runs.push({ run: chapterRun, chapter: summary.chapterSummaries[chapter] });
    }

    await fs.writeFile(`${options.dir}/threads/chapters.json`, JSON.stringify(runs, null, 2));

    const resultMessages = [];

    for (const [i, run] of runs.entries()) {
      let status = { status: "running" };
      while (status.status !== "completed") {
        await sleep(1000);
        status = await openai.beta.threads.runs.retrieve(run.run.thread_id, run.run.id);
      }

      const threadMessages = await openai.beta.threads.messages.list(run.run.thread_id);
      console.log(threadMessages.data);
      await fs.writeFile(
        `${options.dir}/threads/chapter_${i}_messages.json`,
        JSON.stringify(threadMessages.data, null, 2)
      );

      const assistantMessage = threadMessages.data.find((message) => message.role === "assistant");
      resultMessages.push({
        i,
        chapter: run.chapter,
        desc: assistantMessage.content[0].text.value,
      });
    }

    for (const message of resultMessages) {
      console.log(message.chapter.title);
      console.log(message.desc);

      await fs.writeFile(
        `${options.dir}/chapters/${message.i}.md`,
        `## ${message.chapter.title}\n\n${message.desc}`
      );
    }
  });

program
  .command("prose:scribe")
  .description(
    "Write the prose for your story based on a plotto description and character summaries"
  )
  .option("-p, --plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("-s, --summary <summary>", "the summary JSON file", "summary.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .option("--resume-from <resumeFrom>", "the scene to resume from")
  .option("--resume-from-thread <threadId>", "the thread ID to resume from")
  .action(async (options) => {
    console.log(options);
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));
    const summary = JSON.parse(await fs.readFile(`${options.dir}/${options.summary}`));
    const summaryAssistant = JSON.parse(await fs.readFile(`${options.dir}/assistant.json`));
    const metadata = summaryAssistant.metadata;

    const characterInfo = (await readFiles(`${options.dir}/characters`)).map((ch) => {
      const character = ch.filename;
      const description = ch.content;
      const plotCharacterInfoBySymbol = plot.cast.find((ch) => ch.symbol === character);

      return {
        id: character,
        name: plotCharacterInfoBySymbol.name,
        description,
      };
    });

    let chapterScenes = (await readFiles(`${options.dir}/chapters`))
      .map((ch) => {
        const chapter = ch.filename;
        const title = summary.chapterSummaries[chapter].title;
        const scenes = ch.content
          .split("\n\n")
          .slice(1)
          .map((scene) => {
            return {
              title,
              chapter,
              scene,
            };
          });
        return scenes;
      })
      .flat();

    const prompt = systemPrompt.proseSystem(characterInfo, summary, plot, summary.title);

    metadata.purpose = "prose";

    const assistant = await openai.beta.assistants.create({
      instructions: prompt,
      name: `Automuse ${summary.title} scribe`,
      description: "An authorial assistant for writing novels",
      model: options.openaiModel,
      metadata,
    });

    let thread = await openai.beta.threads.create({ metadata });

    let step = 1;
    let lastChapterTitle = "The Heavy Bandwidth of Truth";

    if (options.resumeFrom !== null) {
      chapterScenes = chapterScenes.slice(options.resumeFrom - 1);
      step = options.resumeFrom;
      thread = await openai.beta.threads.retrieve(options.resumeFromThread);
    }

    for (const scene of chapterScenes) {
      if (scene.title !== lastChapterTitle) {
        thread = await openai.beta.threads.create({ metadata });
      }
      const scenePrompt = systemPrompt.prose(scene.scene);

      const sceneMessage = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: scenePrompt,
        metadata,
      });

      await fs.writeFile(
        `${options.dir}/threads/prose_${step}_message.json`,
        JSON.stringify(sceneMessage, null, 2)
      );

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        metadata,
      });

      console.log(`made run ${run.id} for ${step} in chapter ${scene.title}`);

      await fs.writeFile(
        `${options.dir}/threads/prose_${step}_run.json`,
        JSON.stringify(run, null, 2)
      );

      let status = { status: "running" };
      while (status.status !== "completed") {
        await sleep(1000);
        status = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
      }

      const threadMessages = await openai.beta.threads.messages.list(run.thread_id, { limit: 1 });

      await fs.writeFile(
        `${options.dir}/threads/prose_${step}_result.json`,
        JSON.stringify(threadMessages.data, null, 2)
      );

      const assistantMessage = threadMessages.data[0];

      let printTitle = false;
      if (scene.title !== lastChapterTitle) {
        lastChapterTitle = scene.title;
        printTitle = true;
      }

      await fs.writeFile(
        `${options.dir}/src/${step}.md`,
        `${printTitle ? `## ${scene.title}\n\n` : ""} ${assistantMessage.content[0].text.value}`
      );

      console.log(`Wrote ${options.dir}/src/${step}.md`);

      step++;
    }
  });

program
  .command("ebook:cover")
  .description("Generate a cover for the novel")
  .option("--dalle-model <dalleModel>", "the dall-e model to use", "dall-e-3")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-3.5-turbo")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .option("--plot <plot>", "the plotto plot JSON file", "plot.json")
  .option("--summary <summary>", "the summary JSON file", "summary.json")
  .action(async (options) => {
    const summary = JSON.parse(await fs.readFile(`${options.dir}/${options.summary}`));
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));

    const imagePrompt = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an illustrator working on a novel. You will be given the novel summary and return a detailed and comprehensive DALL-E prompt that will be used to generate the cover image. Only include the text in your response.",
        },
        {
          role: "user",
          content: summary.summary,
        },
      ],
      model: options.openaiModel,
    });

    console.log(imagePrompt.choices[0].message.content);

    const coverResp = await openai.images.generate({
      model: options.dalleModel,
      prompt: imagePrompt.choices[0].message.content,
      quality: "hd",
      size: "1024x1792",
      style: "natural",
    });

    const coverURL = coverResp.data[0].url;
    console.log(coverURL);
    const resp = fetch(coverURL);

    const fileStream = createWriteStream(`${options.dir}/cover.png`);
    await new Promise((resolve, reject) => {
      resp.body.pipe(fileStream);
      resp.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
  });

program
  .command("ebook:prepare")
  .description("Compile the novel into an ebook")
  .option("--dir <dir>", "the directory to use for the project", "./var/am2")
  .option("-p, --plot <plotFname>", "the plotto plot JSON file", "plot.json")
  .option("-s, --summary <summaryFname>", "the summary JSON file", "summary.json")
  .option("--openai-model <openaiModel>", "the OpenAI model to use", "gpt-4-1106-preview")
  .action(async (options) => {
    const summary = JSON.parse(await fs.readFile(`${options.dir}/${options.summary}`));
    const plot = JSON.parse(await fs.readFile(`${options.dir}/${options.plot}`));

    await fs.writeFile(
      `${options.dir}/title.txt`,
      `---
title: "${summary.title}"
author: Midori Yasomi
rights: All rights reserved
language: en-US
cover-image: ./cover.png
---`
    );

    await fs.writeFile(
      `${options.dir}/author_info.md`,
      `---

# About the Author

![](./yasomi.png)

${authorBio}`
    );
  });

program
  .command("openai:run:status")
  .argument("<threadId>", "the thread ID to check the status of")
  .argument("<runId>", "the run ID to check the status of")
  .action(async (threadId, runId) => {
    console.log(await openai.beta.threads.runs.retrieve(threadId, runId));
  });

program.parse();
