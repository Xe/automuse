import { Command } from "commander";
import * as dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import PlotGenerator, { Plot } from "@xeserv/plottoriffic";
import { generateName } from "@kotofurumiya/th-namegen";
import * as fs from "node:fs/promises";
import { existsSync as fileExists } from "fs";
import { readPackage } from "read-pkg";

import * as book from "./book.js";

dotenv.config();
const packageInfo = await readPackage();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

program.parse();
