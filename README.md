# TwigVCS

A lightweight Git-like version control system built with Node.js.

## Features

- Initialize repositories
- Stage files for commit
- Create commits with messages
- View commit history
- Show commit differences with color-coded diffs

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Link the command globally:
   ```bash
   npm link
   ```

## Usage

### Initialize a repository
```bash
twig init
```

### Stage files
```bash
# Add a specific file
twig add filename.txt

# Add all files in current directory
twig add .
```

### Create a commit
```bash
twig commit "Your commit message"
```

### View commit history
```bash
twig log
```

### Show commit details
```bash
twig show <commit-hash>
```

## How it Works

TwigVCS creates a `.Twig` folder in your project directory that stores:
- `objects/` - Compressed file contents and commit data
- `HEAD` - Reference to the latest commit
- `index` - Staging area for files

Each file is hashed using SHA-1, and commits are stored as JSON objects containing metadata, file references, and parent commit information.

## Dependencies

- [chalk](https://www.npmjs.com/package/chalk) - Terminal styling
- [commander](https://www.npmjs.com/package/commander) - CLI framework
- [diff](https://www.npmjs.com/package/diff) - Text diffing

## MIT License
