import { Command } from "commander";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { Plot } from "@ebooks/plottoriffic";
import { generateName } from "@kotofurumiya/th-namegen";
import * as fs from "node:fs/promises";
import { existsSync as fileExists } from "fs";
import { readPackage } from "read-pkg";
import { execa } from "execa";

import * as book from "./book.js";

dotenv.config();
const packageInfo = await readPackage();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const program = new Command();

program
  .name(packageInfo.name)
  .description(packageInfo.description as string)
  .version(packageInfo.version);

program
  .command("init [dir]")
  .description("create a new random folder for a book")
  .action(async (dir = `var/${generateName()}`) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(`${dir}/src`, { recursive: true });

    console.log(`created folder ${dir}`);
  });

program
  .command("genPlotto <dir>")
  .description("generate a new book plotto description")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (fileExists(`${dir}/plotto.json`)) {
      console.error(`plotto data already exists in ${dir}`);
      process.exit(1);
    }

    const plot = await book.createPlot(dir);
    console.log(`created plot, subject: ${plot.subject}`);
  });

program
  .command("showPlotto <dir>")
  .description("show the plotto description for a book directory")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }

    const plot: Plot = JSON.parse(await fs.readFile(`${dir}/plotto.json`, "utf8"));
    console.log(JSON.stringify(plot, undefined, "  "));
  });

program
  .command("genSummary <dir>")
  .description("generate a new summary based on a plotto description")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (fileExists(`${dir}/summary.json`)) {
      console.error(`plot summary already exists in ${dir}`);
      process.exit(1);
    }

    const plot: Plot = JSON.parse(await fs.readFile(`${dir}/plotto.json`, "utf8"));

    const summary = await book.createAndParseSummary(dir, openai, plot);

    console.log(`generated book summary`);
  });

program
  .command("showSummary <dir>")
  .description("dump high-level details about a plot summary")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/summary.json`)) {
      console.error(`plot summary does not exist in ${dir}, run genSummary?`);
      process.exit(1);
    }

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));

    console.log(`title: ${summary.title}\n${summary.plotSummary}\n\ncharacters:`);
    summary.characters.forEach((ch) => console.log(`- ${ch.name}: ${ch.role}`));
    console.log("\nchapters:");
    summary.chapterList.forEach(({ title, summary }) => console.log(`- ${title} - ${summary}`));
  });

program
  .command("genChapterScenes <dir>")
  .description("generate the list of scenes for all of the chapters in the chapter")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/summary.json`)) {
      console.error(`plot summary does not exist in ${dir}, run genSummary?`);
      process.exit(1);
    }
    if (fileExists(`${dir}/chapterScenes.json`)) {
      console.error(`plot summary already exists in ${dir}`);
      process.exit(1);
    }

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));
    const chapters: book.Chapter[] = [];

    for (const ch of summary.chapterList) {
      chapters.push(await book.createChapterScenes(dir, openai, summary, ch));
    }

    console.log(chapters);

    await fs.writeFile(`${dir}/chapterScenes.json`, JSON.stringify(chapters));
  });

program
  .command("writeScenes <dir>")
  .description("write individual scenes to the disk in full detail (expensive command)")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/summary.json`)) {
      console.error(`plot summary does not exist in ${dir}, run genSummary?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/chapterScenes.json`)) {
      console.error(`plot summary does not exist in ${dir}, run genChapterScenes?`);
      process.exit(1);
    }
    if (fileExists(`${dir}/fnames.json`)) {
      console.error(`file name list already exists in ${dir}`);
      process.exit(1);
    }

    await fs.mkdir(`${dir}/src`, { recursive: true });

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));
    const chapters: book.Chapter[] = JSON.parse(
      await fs.readFile(`${dir}/chapterScenes.json`, "utf8")
    );

    const fnames: string[] = [];

    for (let [chNum, ch] of chapters.entries()) {
      chNum = chNum + 1;
      const fname = `ch-${chNum}-sc-00.md`;
      fnames.push(fname);
      await fs.writeFile(`${dir}/src/${fname}`, `# ${ch.title}\n\n`);
      for (let [sceneNum, scene] of ch.sceneDescriptions.entries()) {
        sceneNum = sceneNum + 1;
        fnames.push(await book.writeChapterScene(dir, openai, summary, ch, chNum, sceneNum, scene));
      }
    }

    console.log(fnames);
    await fs.writeFile(`${dir}/fnames.json`, JSON.stringify(fnames, undefined, "  "));
  });

program
  .command("buildEbook <dir>")
  .description("generate the .epub file for the novel")
  .action(async (dir) => {
    if (!fileExists(dir)) {
      console.error(`${dir} does not exist, run init?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/summary.json`)) {
      console.error(`plot summary does not exist in ${dir}, run genSummary?`);
      process.exit(1);
    }
    if (!fileExists(`${dir}/fnames.json`)) {
      console.error(`file name list doesn't exist in ${dir}, run writeScenes?`);
      process.exit(1);
    }

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));
    const fnames: string[] = JSON.parse(await fs.readFile(`${dir}/fnames.json`, "utf8"));

    await fs.writeFile(
      `${dir}/src/title.txt`,
      `---
title: "${summary.title}"
author: Midori Yasomi
rights: All rights reserved
language: en-US
cover-image: ${dir}/cover.jpg
---
`
    );

    await fs.writeFile(`${dir}/src/aboutAuthor.txt`, "---\n\n" + book.authorBio);

    let files = [`${dir}/src/title.txt`];
    files = files.concat(fnames.map((fname) => `${dir}/src/${fname}`));
    files = files.concat([`${dir}/src/aboutAuthor.txt`]);

    let args = ["-o", `${dir}/ebook.epub`, "--to", "epub"];
    args = args.concat(files);
    await execa("pandoc", args);

    args = ["-o", `${dir}/ebook.html`, "--to", "html"];
    args = args.concat(files);
    await execa("pandoc", args);

    args = ["--lua-filter", "./wordcount.lua"];
    args = args.concat(files);
    const { stdout } = await execa("pandoc", args);
    console.log(stdout);
  });

program
  .command("rewriteChapter <dir> <chapter>")
  .description("completely rewrite a single chapter, useful for fixing the generation process")
  .action(async (dir, chapterStr) => {
    await fs.mkdir(`${dir}/src`, { recursive: true });

    const chapter = parseInt(chapterStr);
    console.log({ dir, chapter });

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));
    const chapters: book.Chapter[] = JSON.parse(
      await fs.readFile(`${dir}/chapterScenes.json`, "utf8")
    );

    const ch = await book.createChapterScenes(
      dir,
      openai,
      summary,
      summary.chapterList[chapter - 1]
    );

    chapters[chapter - 1] = ch;

    await fs.writeFile(`${dir}/chapterScenes.json`, JSON.stringify(chapters));

    for (let [sceneNum, scene] of ch.sceneDescriptions.entries()) {
      sceneNum = sceneNum + 1;
      console.log(await book.writeChapterScene(dir, openai, summary, ch, chapter, sceneNum, scene));
    }
  });

program
  .command("writeOneScene <dir>")
  .description("write a single scene of the novel, useful for debugging the generation process")
  .action(async (dir) => {
    await fs.mkdir(`${dir}/src`, { recursive: true });

    const summary: book.Summary = JSON.parse(await fs.readFile(`${dir}/summary.json`, "utf8"));
    const chapters: book.Chapter[] = JSON.parse(
      await fs.readFile(`${dir}/chapterScenes.json`, "utf8")
    );

    const chNum = 1;
    const sceneNum = 2;

    const ch = chapters[chNum - 1];
    const scene = ch.sceneDescriptions[sceneNum - 1];

    await book.writeChapterScene(dir, openai, summary, ch, chNum, sceneNum, scene);
  });

program.parse();
