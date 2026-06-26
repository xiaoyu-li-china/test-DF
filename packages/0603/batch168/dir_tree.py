import argparse
import json
import os
import sys

IGNORED_DIRS = {'.git', 'node_modules', '__pycache__'}
LARGE_FILE_THRESHOLD = 1 * 1024 * 1024


def get_dir_size(path):
    total = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                try:
                    total += os.path.getsize(fp)
                except OSError:
                    pass
    return total


def build_tree(path, prefix="", max_depth=None, current_depth=0):
    entries = []
    if max_depth is not None and current_depth >= max_depth:
        return entries
    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return entries

    links = []
    dirs = []
    files = []
    for item in items:
        full = os.path.join(path, item)
        if os.path.islink(full):
            links.append(item)
        elif os.path.isdir(full):
            if item not in IGNORED_DIRS:
                dirs.append(item)
        else:
            files.append(item)

    all_items = dirs + links + files
    for i, item in enumerate(all_items):
        full = os.path.join(path, item)
        is_last = i == len(all_items) - 1
        connector = "└── " if is_last else "├── "
        child_prefix = "    " if is_last else "│   "

        if os.path.islink(full):
            try:
                target = os.readlink(full)
            except OSError:
                target = "?"
            entries.append(f"{prefix}{connector}{item} -> {target}")
        elif os.path.isdir(full):
            label = f"{item}/"
            try:
                size = get_dir_size(full)
                if size > LARGE_FILE_THRESHOLD:
                    label += " [large]"
            except OSError:
                pass
            entries.append(f"{prefix}{connector}{label}")
            entries.extend(build_tree(full, prefix + child_prefix, max_depth, current_depth + 1))
        else:
            label = item
            try:
                size = os.path.getsize(full)
                if size > LARGE_FILE_THRESHOLD:
                    label += " [large]"
            except OSError:
                pass
            entries.append(f"{prefix}{connector}{label}")

    return entries


def build_json_tree(path, max_depth=None, current_depth=0):
    name = os.path.basename(path) or path
    node = {"name": name, "type": "dir", "size": 0, "children": []}
    if max_depth is not None and current_depth >= max_depth:
        return node
    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return node

    for item in items:
        full = os.path.join(path, item)
        if os.path.islink(full):
            try:
                target = os.readlink(full)
            except OSError:
                target = "?"
            child = {"name": f"{item} -> {target}", "type": "link", "size": 0, "children": []}
            node["children"].append(child)
        elif os.path.isdir(full):
            if item in IGNORED_DIRS:
                continue
            child = build_json_tree(full, max_depth, current_depth + 1)
            child["size"] = get_dir_size(full)
            node["children"].append(child)
        else:
            try:
                size = os.path.getsize(full)
            except OSError:
                size = 0
            child = {"name": item, "type": "file", "size": size, "children": []}
            node["children"].append(child)

    node["size"] = sum(c["size"] for c in node["children"])
    return node


def main():
    parser = argparse.ArgumentParser(description="Generate directory tree")
    parser.add_argument("path", nargs="?", default=".", help="Target directory")
    parser.add_argument("--json", action="store_true", dest="json_output", help="Output as JSON")
    parser.add_argument("--max-depth", type=int, default=None, help="Max traversal depth")
    args = parser.parse_args()

    target = os.path.abspath(args.path)
    basename = os.path.basename(target) or target

    if args.json_output:
        root = build_json_tree(target, args.max_depth)
        root["name"] = basename
        root["size"] = get_dir_size(target)
        output_path = os.path.join(target, "tree.json") if os.path.isdir(target) else "tree.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(root, f, ensure_ascii=False, indent=2)
        print(f"JSON tree written to {output_path}")
    else:
        lines = [basename + "/"]
        lines.extend(build_tree(target, max_depth=args.max_depth))
        output_path = os.path.join(target, "tree.txt") if os.path.isdir(target) else "tree.txt"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        print(f"Tree written to {output_path}")


if __name__ == "__main__":
    main()
