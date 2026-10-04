import {copyFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {createInterface} from "node:readline/promises";
import {stdin, stdout, argv} from "node:process";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const staticSrc = join(publicDir, "404-static.html");
const dynamicSrc = join(publicDir, "404-dynamic.html");
const dest = join(publicDir, "404.html");

if (!existsSync(staticSrc) || !existsSync(dynamicSrc)) {
    console.error("[set-404] missing 404-static.html or 404-dynamic.html in public/");
    process.exit(1);
}

let choice = argv[2]?.toLowerCase();

if (!choice) {
    const rl = createInterface({input: stdin, output: stdout});
    const answer = (await rl.question("404 mode? [s]tatic / [d]ynamic: ")).trim().toLowerCase();
    rl.close();
    choice = answer;
}

const map = {s: "static", static: "static", d: "dynamic", dynamic: "dynamic"};
const mode = map[choice];

if (!mode) {
    console.error(`[set-404] unknown choice: ${choice}`);
    process.exit(1);
}

const src = mode === "static" ? staticSrc : dynamicSrc;
copyFileSync(src, dest);
console.log(`[set-404] ${mode} -> public/404.html`);
