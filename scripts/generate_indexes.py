import json
import os
import utils

"""
{
  exclude: string[];
  filename: string;
  isModel: boolean;
  dirs: string[];
}[]
"""

def generate_model(path, module_name):
    return """import {name} from "./{path}";
export {{default as {name}}} from "./{path}";
export let {lowerName}: orm.Repository<{name}> = undefined;
""".format(name=module_name, lowerName=utils.to_camel_case(module_name), path=path)

def generate_index(path, module_name):
    return "export {{default as {name}}} from \"./{path}\";".format(name=module_name, path=path)

def generate_export(path):
    handle = open(path, "r")
    lines = handle.read().replace("\r", "").split("\n")
    handle.close()
    real_lines = []
    for line in lines:
        line = line.replace(" default ", " ")
        raw_line = line.strip()
        if raw_line.startswith("@") or raw_line.startswith("import ") or raw_line == "":
            continue
        if raw_line.startswith("export ") and raw_line.endswith(";"):
            continue
        if raw_line == "// stop-generate":
            print("stop-generate encountered in " + path)
            real_lines.append("}")
            break
        real_lines.append(line)
    return real_lines

def generate(config):
    server_dir = utils.get_server_dir()
    lines = [
        "// Automatically generated by /scripts/generate_indexes.py"
    ]
    if "prepend" in config:
        lines += config["prepend"]
    if config["type"] == "model":
        basedir = os.path.dirname(server_dir + config["filename"])
        relpath = os.path.relpath(server_dir, basedir).replace("\\", "/")
        lines.append("import * as orm from \"typeorm\";")
        lines.append("import * as eta from \"{}/eta\";\n".format(relpath))
    basedir = os.path.dirname(server_dir + config["filename"])
    exclude = config["exclude"] if "exclude" in config else []
    file_ending = ".ts" if config["type"] == "export" else ".js"
    for dirname in config["dirs"]:
        real_files = []
        for root, _, files in os.walk(server_dir + dirname):
            for filename in files:
                if filename == "index" + file_ending or not filename.endswith(file_ending):
                    continue
                absolute_filename = root + "/" + filename
                if file_ending == ".js":
                    if not os.path.exists(absolute_filename.replace(".js", ".ts")):
                        print("Extra file ({}) found. Skipping.".format(absolute_filename))
                        continue
                if filename.startswith("I"):
                    real_files.insert(0, absolute_filename)
                else:
                    real_files.append(absolute_filename)
        for filename in real_files:
            module_name = filename.split("/")[-1].split(".")[0]
            if config["type"] != "model" and module_name in exclude:
                continue
            path = os.path.relpath(filename, start=basedir)
            path = ".".join(path.split(".")[0:-1]).replace("\\", "/")
            if config["type"] == "model":
                if module_name in exclude:
                    lines.append(generate_index(path, module_name))
                else:
                    lines.append(generate_model(path, module_name))
            elif config["type"] == "export":
                lines += generate_export(filename)
            else:
                lines.append(generate_index(path, module_name))
    handle = open(server_dir + config["filename"], "w")
    handle.write("\n".join(lines) + "\n")
    handle.close()

def handle_config(filename):
    if not os.path.exists(filename):
        return
    handle = open(filename, "r")
    configs = json.loads(handle.read())
    handle.close()
    for config in configs:
        generate(config)

def main():
    server_dir = utils.get_server_dir()
    handle_config(server_dir + "indexes.json")
    handle_config(server_dir + "content/indexes.json")
    print("Compiling server-side Typescript...")
    utils.compile_ts()
    print("\nCompiling client-side Typescript...")
    utils.compile_ts()

if __name__ == "__main__":
    main()
