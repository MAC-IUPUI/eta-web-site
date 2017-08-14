import * as fs from "fs-extra";
import * as path from "path";
import * as utils from "./utils";
import HelperArray from "../helpers/array";
import HelperFS from "../helpers/fs";
import HelperObject from "../helpers/object";
import HelperString from "../helpers/string";

interface ScriptItem {
    name: string;
    absoluteFilename: string;
    relativeFilename: string;
}

const SERVER_DIR: string = utils.getServerDir();

function getModelSnippet(item: ScriptItem): string {
    return `import ${item.name} from "./${item.relativeFilename}";
export {default as ${item.name}} from "./${item.relativeFilename}";
export function ${HelperString.toCamelCase(item.name)}(): orm.Repository<${item.name}> { return orm.getRepository(${item.name}); }`;
}

function getIndexSnippet(item: ScriptItem): string {
    return `export {default as ${item.name}} from "./${item.relativeFilename}";`;
}

function getExportSnippet(item: ScriptItem): string[] {
    let lines: string[] = (fs.readFileSync(item.absoluteFilename.replace(/\.js/g, ".ts"), "utf-8")).split("\n")
        .map(l => l.replace(/ default /g, " ").replace(/\r/g, ""))
        .filter(l => {
            l = l.trim();
            return !l.startsWith("@") &&
                !l.startsWith("import ") &&
                l.length > 0 &&
                !(l.startsWith("export ") && l.endsWith(";"));
        });
    const stopIndex: number = lines.map(l => l.trim()).indexOf("// stop-generate");
    if (stopIndex !== -1) {
        lines = lines.splice(0, stopIndex);
        lines.push("}");
    }
    return lines;
}

async function getScriptItems(dirs: string[], fileEnding: string, baseDir: string = SERVER_DIR): Promise<ScriptItem[]> {
    let items: ScriptItem[] = [];
    await HelperArray.forEachAsync(dirs, async dir => {
        items = items.concat((await HelperFS.recursiveReaddir(dir)).map(f => {
            f = f.replace(/\\/g, "/");
            return <ScriptItem>{
                name: path.basename(f, fileEnding),
                relativeFilename: path.relative(baseDir, f).replace(/\\/g, "/"),
                absoluteFilename: f
            };
        }).filter(f =>
            f.name !== "index" &&
            f.absoluteFilename.endsWith(fileEnding) &&
            !(fileEnding === ".js" && !HelperFS.existsSync(f.absoluteFilename.replace(/\.js/g, ".ts")))
        ));
    }, true);
    return items;
}

async function generateFiles(config: any, modulePath: string): Promise<void> {
    let lines: string[] = ["// Automatically generated by Eta v2's /scripts/generate.ts"];
    if (config.prepend) {
        lines = lines.concat(config.prepend);
    }
    const basePath: string = path.dirname(modulePath + "/" + config.filename);
    if (!config.exclude) config.exclude = [];
    const fileEnding: string = config.type === "export" ? ".ts" : ".js";
    (await Promise.all((<string[]>config.dirs).map(d => {
        const moduleDir: string = modulePath + "/" + d;
        return getScriptItems([moduleDir], fileEnding, moduleDir);
    }))).reduce((prev, next) => prev.concat(next)).filter(i =>
            !config.exclude.includes(i.name)
        ).sort(i =>
            i.name.startsWith("I") ? 0 : 1
        ).forEach(item => {
            if (config.exclude.includes(item.name)) return;
            if (config.type === "export") {
                lines = lines.concat(getExportSnippet(item));
            } else {
                lines.push(getIndexSnippet(item));
            }
        }
    );
    await fs.writeFile(modulePath + "/" + config.filename, lines.join("\r\n") + "\r\n");
}

async function generateModels(): Promise<void> {
    const moduleNames: string[] = await fs.readdir(SERVER_DIR + "/modules");
    const modelDirs: string[] = moduleNames.map(moduleName => {
        const moduleConfig: any = JSON.parse(fs.readFileSync(SERVER_DIR + "/modules/" + moduleName + "/eta.json", "utf-8"));
        return (<string[]>moduleConfig.dirs.models)
            .map(d => SERVER_DIR + "/modules/" + moduleName + "/" + d);
    }).reduce((prev, next) => prev.concat(next));
    const items: ScriptItem[] = (await getScriptItems(modelDirs, ".js"))
        .sort((a, b) => a.absoluteFilename.localeCompare(b.absoluteFilename));
    const dbLines: string[] = [
        "// Automatically generated by Eta v2's /scripts/generate.ts",
        "import * as orm from \"typeorm\";",
        "import * as eta from \"./eta\";"
    ];
    const initLines: string[] = HelperObject.clone(dbLines);
    let exportLines: string[] = [];
    await HelperArray.forEachAsync(items, async item => {
        const code: string = await fs.readFile(item.absoluteFilename, "utf-8");
        if (code.includes("// generate:ignore-file")) {
            dbLines.push(getIndexSnippet(item));
        } else {
            dbLines.push(getModelSnippet(item));
            initLines.push(getIndexSnippet(item));
        }
        const exportSnippet: string[] = getExportSnippet(item);
        if (code.includes("// generate:sort-first")) {
            exportLines = exportSnippet.concat(exportLines);
        } else {
            exportLines = exportLines.concat(exportSnippet);
        }
    });
    exportLines.splice(0, 0, "// Automatically generated by Eta v2's /scripts/generate.ts");
    const promises: Promise<void>[] = [
        fs.writeFile(SERVER_DIR + "/db.ts", dbLines.join("\r\n") + "\r\n"),
        fs.writeFile(SERVER_DIR + "/db-init.ts", initLines.join("\r\n") + "\r\n")
    ];
    const exportBody: string = exportLines.join("\r\n") + "\r\n";
    moduleNames.forEach(moduleName => {
        const jsDir: string = SERVER_DIR + "/modules/" + moduleName + "/static/js";
        if (fs.existsSync(jsDir)) {
            promises.push(fs.writeFile(jsDir + "/db.ts", exportBody));
        }
    });
    await Promise.all(promises);
}

async function handleIndexConfig(filename: string, useKey = true): Promise<void> {
    if (!await HelperFS.exists(filename)) {
        return;
    }
    let configs: any = JSON.parse(await fs.readFile(filename, "utf-8"));
    if (useKey) {
        configs = configs["indexes"] ? configs["indexes"] : [];
    }
    await Promise.all((<any[]>configs).map((config: any) => generateFiles(config, path.dirname(filename))));
}

function writeModuleExports(moduleDir: string): Promise<void[]> {
    return Promise.all([
        fs.writeFile(moduleDir + "/eta.ts", `export * from "../../eta";`),
        fs.writeFile(moduleDir + "/db.ts", `export * from "../../db";`)
    ]);
}

async function main(): Promise<void> {
    await handleIndexConfig(SERVER_DIR + "/indexes.json", false);
    if (await HelperFS.exists(SERVER_DIR + "/modules")) {
        await Promise.all([
            HelperArray.forEachAsync(await fs.readdir(SERVER_DIR + "/modules"), moduleName => {
                const moduleDir: string = SERVER_DIR + "/modules/" + moduleName;
                return <Promise<any>>Promise.all([
                    handleIndexConfig(moduleDir + "/eta.json"),
                    writeModuleExports(moduleDir)
                ]);
            }),
            generateModels()
        ]);
    }
    console.log("Finished generating indexes and exports.");
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => {
        console.error(err);
    });
}
