import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import chalk from 'chalk';
import { diffLines } from 'diff';
import { Command } from 'commander';

const program = new Command();

class Twig {
    constructor(repoPath = '.') {
        this.repoPath = path.join(repoPath, '.Twig');
        this.objectPath = path.join(this.repoPath, 'objects'); // .Twig/objects
        this.headPath = path.join(this.repoPath, 'HEAD'); // .Twig/HEAD
        this.indexPath = path.join(this.repoPath, 'index'); // .Twig/index
    }
    async init() {
        await fs.mkdir(this.objectPath, { recursive: true });
        try {
            // wx : open for writing, fails if the path already exists
            await fs.writeFile(this.headPath, '', { flag: 'wx' });
            await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: 'wx' });

        } catch (errory) {
            console.log("already initialized the .Twig folder");
        }
    }

    hashObject(content) {
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded) {
        // Handle '.' to add all files in current directory
        if (fileToBeAdded === '.') {
            const files = await fs.readdir(process.cwd());
            for (const file of files) {
                // Skip .Twig directory, node_modules, and hidden files
                if (file === '.Twig' || file === 'node_modules' || file.startsWith('.')) {
                    continue;
                }
                const filePath = path.join(process.cwd(), file);
                const stat = await fs.stat(filePath);
                // Only add files, not directories
                if (stat.isFile()) {
                    await this.addFile(filePath);
                }
            }
            return;
        }
        
        await this.addFile(fileToBeAdded);
    }

    async addFile(fileToBeAdded) {
        const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' });
        const fileHash = this.hashObject(fileData);
        console.log(`File Hash: ${fileHash}`);
        const newFileHashObjFile = path.join(this.objectPath, fileHash);
        await fs.writeFile(newFileHashObjFile, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added file ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        index.push({ path: filePath, hash: fileHash });
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }
    async commit(message) {
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit
        }

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        await fs.writeFile(this.headPath, commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([])); // clear staging area
        console.log(`Commit successfully created with hash: ${commitHash}`);
    }

    async getCurrentHead() {
        try {
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        } catch (error) {
            return null;
        }
    }
    async log() {
        let currentCommitHash = await this.getCurrentHead();
        while (currentCommitHash) {
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectPath, currentCommitHash), { encoding: 'utf-8' }));
            console.log('-------------------------');
            console.log(`Commit: ${currentCommitHash}`);
            console.log(`Date: ${commitData.timeStamp}`);
            console.log(`Message: ${commitData.message}`);
            currentCommitHash = commitData.parent;
        }
    }
    async showCommitDiff(commitHash) {
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if (!commitData) {
            console.log(`No commit found with hash: ${commitHash}`);
            return;
        }
        else{
            console.log("first commit");
        }
        console.log("Changes in the last commit are: ");
        for (const file of commitData.files) {
            console.log(`File: ${file.path}, Hash: ${file.hash}`);
            const fileContent = await this.getFileContent(file.hash);
            console.log(`Content:\n${fileContent}`);

            if (commitData.parent) {
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const parentFileContent = await this.getParentFileContent(file.path, commitData.parent);
                if (parentFileContent != undefined) {
                    console.log(`Diff:`);
                    const diff = diffLines(parentFileContent, fileContent);
                    console.log(diff);
                    diff.forEach(part => {
                        if (part.added) {
                            process.stdout.write("++" + chalk.green(part.value));
                        } else if (part.removed) {
                            process.stdout.write("--" + chalk.red(part.value));
                        } else {
                            process.stdout.write(chalk.grey(part.value));
                        }
                    console.log();

                    });
                    console.log();
                }else {
                    console.log("new file in this commit");
                }
            }

        }
    }
    async getParentFileContent(filePath, parentCommitHash) {
        const parentCommitData = JSON.parse(await this.getCommitData(parentCommitHash));
        if (!parentCommitData) {
            return undefined;
        }
        const parentFile = parentCommitData.files.find(f => f.path === filePath);
        if (parentFile) {
            return await this.getFileContent(parentFile.hash);
        }
        return undefined;
    }
    async getFileContent(fileHash) {
        const filePath = path.join(this.objectPath, fileHash);
        return await fs.readFile(filePath, { encoding: 'utf-8' });
    }
    async getCommitData(commitHash) {
        const commitPath = path.join(this.objectPath, commitHash);
        try {
            return await fs.readFile(commitPath, { encoding: 'utf-8' });
        } catch (error) {
            console.log(`Commit with hash not found. ${commitHash}`);
            return null;
        }
    }
}

// (async () => {
//     const twig = new Twig();
//     await twig.add('sample.txt');
//     await twig.add('sample2.txt');
//     await twig.commit('the new commit');
//     await twig.log();
//     await twig.showCommitDiff('2ad83928b148764d445e0cb4c9a8486e6d1b2ef8')
// })();

program.command('init').action(async () => {
    console.log("Initializing Twig repository...");
    const twig = new Twig();
    await twig.init();
    console.log("Initialized Twig repository");
});

program.command('add <file>').action(async (file) => {
    const twig = new Twig();
    await twig.add(file);
});
program.command('commit <message>').action(async (message) => {
    const twig = new Twig();
    await twig.commit(message);
});
program.command('log').action(async () => {
    const twig = new Twig();
    await twig.log();
});
program.command('show <commitHash>').action(async (commitHash) => {
    const twig = new Twig();
    await twig.showCommitDiff(commitHash);
});

program.parse(process.argv);
 