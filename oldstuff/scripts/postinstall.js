import {existsSync, copyFileSync, readFileSync, writeFileSync, rmSync, cpSync, mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {scramjetPath} from "@mercuryworkshop/scramjet/path";
import {libcurlPath} from "@mercuryworkshop/libcurl-transport";
import {baremuxPath} from "@mercuryworkshop/bare-mux/node";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

// mrrowisp config bootstrap
const mrrowispCfg = join(root, "node_modules/mrrowisp/dist/config.json");
const mrrowispExample = join(root, "node_modules/mrrowisp/dist/example.config.json");
if (existsSync(mrrowispExample) && !existsSync(mrrowispCfg)) {
    copyFileSync(mrrowispExample, mrrowispCfg);
}
if (existsSync(mrrowispCfg)) {
    const cfg = JSON.parse(readFileSync(mrrowispCfg, "utf-8"));
    if (typeof cfg.port === "string") cfg.port = parseInt(cfg.port) || 6001;
    writeFileSync(mrrowispCfg, JSON.stringify(cfg, null, 2));
}

// copy transport dist dirs into public/
const targets = [
    ["scram", scramjetPath],
    ["libcurl", libcurlPath],
    ["baremux", baremuxPath],
];

for (const [name, src] of targets) {
    const dest = join(publicDir, name);
    rmSync(dest, {recursive: true, force: true});
    mkdirSync(dest, {recursive: true});
    cpSync(src, dest, {recursive: true});
    console.log(`[postinstall] copied ${name} -> public/${name}`);
}
