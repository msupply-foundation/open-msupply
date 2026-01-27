#!/usr/bin/env python3
"""
README Glossary Generator

This script searches for all readme.md files in a directory tree and creates
a glossary with links to each file and their word counts.
"""

import os
import sys
from pathlib import Path
from collections import defaultdict


def count_words(file_path):
    """Count the number of words in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            words = content.split()
            return len(words)
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
        return 0


def should_ignore_path(path):
    """
    Check if a path should be ignored.
    
    Returns True if the path contains directories that should be ignored.
    """
    ignore_dirs = {'node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build'}
    parts = Path(path).parts
    return any(part in ignore_dirs for part in parts)


def find_readme_files(root_dir):
    """
    Find all readme.md files in the directory tree.
    
    Returns a list of tuples: (relative_path, absolute_path, word_count)
    """
    root_path = Path(root_dir).resolve()
    readme_files = []
    
    for file_path in root_path.rglob('readme.md'):
        if file_path.is_file():
            relative_path = file_path.relative_to(root_path)
            # Skip if path contains ignored directories
            if should_ignore_path(relative_path):
                continue
            word_count = count_words(file_path)
            readme_files.append((str(relative_path), str(file_path), word_count))
    
    # Also check for README.md (case-insensitive search)
    for file_path in root_path.rglob('README.md'):
        if file_path.is_file():
            relative_path = file_path.relative_to(root_path)
            # Skip if path contains ignored directories
            if should_ignore_path(relative_path):
                continue
            # Avoid duplicates if both readme.md and README.md exist
            if str(relative_path) not in [rf[0] for rf in readme_files]:
                word_count = count_words(file_path)
                readme_files.append((str(relative_path), str(file_path), word_count))
    
    return sorted(readme_files)


def build_tree_structure(readme_files):
    """
    Build a tree structure from the list of README files.
    
    Returns a nested dictionary representing the directory tree.
    """
    tree = {}
    
    for relative_path, absolute_path, word_count in readme_files:
        parts = Path(relative_path).parts
        current = tree
        
        # Navigate/create the tree structure
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # This is the file itself
                current[part] = {
                    '_file': True,
                    '_path': relative_path,
                    '_abs_path': absolute_path,
                    '_word_count': word_count
                }
            else:
                # This is a directory
                if part not in current:
                    current[part] = {}
                current = current[part]
    
    return tree


def write_tree(f, tree, indent=0, use_absolute_paths=False, parent_path=""):
    """
    Recursively write the tree structure to the file.
    
    Args:
        f: File object to write to
        tree: Dictionary representing the tree structure
        indent: Current indentation level
        use_absolute_paths: Whether to use absolute paths in links
        parent_path: Path to the parent directory
    """
    indent_str = "   " * indent
    
    # Sort items: directories first, then files
    items = sorted(tree.items(), key=lambda x: (x[1].get('_file', False), x[0]))
    
    for name, node in items:
        if node.get('_file'):
            # Check if this is a README.md or readme.md file
            if name.lower() == 'readme.md':
                # Skip it - it will be linked in the parent folder name
                continue
            else:
                # This is a non-README file (edge case)
                link_path = node['_abs_path'] if use_absolute_paths else node['_path']
                word_count = node['_word_count']
                f.write(f"{indent_str}- [{name}]({link_path}) — **{word_count:,} words**\n")
        else:
            # This is a directory
            # Check if this directory contains a README file
            readme_file = None
            for key in node.keys():
                if key.lower() == 'readme.md' and node[key].get('_file'):
                    readme_file = node[key]
                    break
            
            if readme_file:
                # Directory has a README - put link in folder name
                link_path = readme_file['_abs_path'] if use_absolute_paths else readme_file['_path']
                word_count = readme_file['_word_count']
                f.write(f"{indent_str}- **[{name}/]({link_path})** — **{word_count:,} words**\n")
            else:
                # Directory has no README - just show folder name
                f.write(f"{indent_str}- **{name}/**\n")
            
            # Recursively write subdirectories
            write_tree(f, node, indent + 1, use_absolute_paths, parent_path + name + "/")


def generate_glossary(readme_files, output_file='README_GLOSSARY.md', use_absolute_paths=False):
    """
    Generate a markdown glossary file with hierarchical structure.
    
    Args:
        readme_files: List of tuples (relative_path, absolute_path, word_count)
        output_file: Name of the output glossary file
        use_absolute_paths: Whether to use absolute paths in links (default: False)
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# README Files Glossary\n\n")
        f.write(f"Found {len(readme_files)} README file(s)\n\n")
        f.write("---\n\n")
        
        if not readme_files:
            f.write("No README files found.\n")
            return
        
        # Check for root-level README
        root_readme = None
        non_root_files = []
        for relative_path, absolute_path, word_count in readme_files:
            if relative_path.lower() == 'readme.md':
                root_readme = (relative_path, absolute_path, word_count)
            else:
                non_root_files.append((relative_path, absolute_path, word_count))
        
        # Write root README if it exists
        if root_readme:
            relative_path, absolute_path, word_count = root_readme
            link_path = absolute_path if use_absolute_paths else relative_path
            f.write(f"- **[{relative_path}]({link_path})** (root) — **{word_count:,} words**\n\n")
        
        # Build and write the tree structure for non-root files
        if non_root_files:
            tree = build_tree_structure(non_root_files)
            write_tree(f, tree, 0, use_absolute_paths, "")
        
        f.write(f"\n---\n\n*Generated by README Glossary Generator*\n")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Generate a glossary of all README.md files in a directory tree'
    )
    parser.add_argument(
        'directory',
        nargs='?',
        default='.',
        help='Root directory to search (default: current directory)'
    )
    parser.add_argument(
        '-o', '--output',
        default='README_GLOSSARY.md',
        help='Output file name (default: README_GLOSSARY.md)'
    )
    parser.add_argument(
        '-a', '--absolute',
        action='store_true',
        help='Use absolute paths in links instead of relative paths'
    )
    
    args = parser.parse_args()
    
    # Validate directory
    if not os.path.isdir(args.directory):
        print(f"Error: '{args.directory}' is not a valid directory", file=sys.stderr)
        sys.exit(1)
    
    print(f"Searching for README files in: {os.path.abspath(args.directory)}")
    readme_files = find_readme_files(args.directory)
    
    print(f"Found {len(readme_files)} README file(s)")
    
    generate_glossary(readme_files, args.output, args.absolute)
    
    print(f"Glossary generated: {args.output}")


if __name__ == '__main__':
    main()
