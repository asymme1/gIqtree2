import { ChildProcess, execFile } from 'child_process';
import { ReReadable } from 'rereadable-stream';
import { ipcMain } from 'electron-better-ipc';
import merge from 'merge-stream';
import { accessSync, chmodSync, constants, statSync } from 'fs';
import { WriteStream } from 'tty';
import { WatchDir, recurseAsync } from './filesystem';
import { BrowserWindow } from 'electron';
const currentProcess = new Map<string, Task[]>();
const currentWatcher = new Map<string, WatchDir>();
interface SpawnData {
    id: string;
    arguments: string[][];
    binary: string;
}

export class Task {
    public readonly binary: string = '';
    public readonly arguments: string[] = [];
    public process: ChildProcess | undefined;
    public outputStream: ReReadable | undefined;
    public constructor(binary: string, execArguments: string[]) {
        this.binary = binary;
        this.arguments = execArguments;
    }

    start() {
        this.process = execFile(this.binary, this.arguments, {
            maxBuffer: 1024 * 1024 * 50
        })
        this.outputStream = merge(this.process.stdout! as WriteStream, this.process.stderr! as WriteStream)!.pipe(new ReReadable({
            length: 1024 * 1024 * 50
        }));

        console.log(`spawning process id ${this.process.pid} with arguments "${this.arguments.join(' ')}"`);
        this.process.on('exit', () => {
            console.log(`child process id ${this.process!.pid} exited with exit code ${this.process!.exitCode}`);
            if (this.process!.signalCode !== null)
                console.log(`child process id ${this.process!.pid} seems to be killed with code ${this.process!.signalCode}`)
        });

        return this.process;
    }
}

ipcMain.answerRenderer('spawn', async (data: SpawnData) => {
    if (currentProcess.has(data.id)) {
        let records = currentProcess.get(data.id)!
        if (records.some(r => r.process?.exitCode === null && !r.process?.signalCode))
            return false;
    }

    let tasks = data.arguments.map(process => new Task(data.binary, process));
    currentProcess.set(data.id, tasks);

    let split = async () => {
        try {
            try {
                accessSync(data.binary, constants.X_OK);
            } catch {
                let fileStat = statSync(data.binary);
                chmodSync(data.binary, fileStat.mode | constants.S_IXUSR);
            }

            let first : number | undefined;
            for (let task of tasks) {
                task.start();
                if (first === undefined) {
                    first = task.process!.pid;
                    console.log(`Starting task, first PID is ${first}`);
                }
                else {
                    console.log(`Spawned child w/ PID ${task.process!.pid}, from task w/ first PID ${first}`);
                }
                await new Promise(res => task.process!.on('close', res));
            }
        } catch (e) {
            console.error('An error occurred trying to spawn child process.')
            console.error(e);
            return false;
        }
    };

    // don't block
    split();
})

ipcMain.answerRenderer('list', () => {
    return [...currentProcess].map(pair => <const>[pair[0], pair[1][0]]);
})

ipcMain.answerRenderer('get', (id: string) => {
    if (!currentProcess.has(id)) {
        return false;
    }

    return JSON.parse(
        JSON.stringify(currentProcess.get(id)!)
    );
})

ipcMain.answerRenderer('get-stdout', async (id: string) => {
    if (!currentProcess.has(id)) {
        return false;
    }

    let tasks = currentProcess.get(id)!;
    let result = tasks.map(async t => {
        const chunks: Buffer[] = [];
        if (!t.outputStream) return '';

        let stdout = await new Promise((res, rej) => {
            let stream = t.outputStream!.rewind();
            stream.on('data', c => chunks.push(Buffer.from(c)));
            stream.on('error', rej);
            let output = () => res(Buffer.concat(chunks).toString('utf-8'));
            setTimeout(output, 100);
            stream.on('end', output)
        })

        return stdout as string;
    })

    return await Promise.all(result);
})

ipcMain.answerRenderer('kill', async (id: string) => {
    if (!currentProcess.has(id)) {
        return false;
    }

    let tasks = currentProcess.get(id)!;
    for (let task of tasks) task.process?.kill('SIGKILL');
})

ipcMain.answerRenderer('watch-dir', async (path: string, win: BrowserWindow) => {
    try {
        let watcher = new WatchDir(path);
        
        currentWatcher.set(path, watcher);
        watcher.addListener(async (event : string, filename : string) => {
            
            let node = await recurseAsync(path)
            await ipcMain.callRenderer(win, 'watch-dir-update', node);
        });
        return "";
    } catch (e) {
        console.log(e)
    return "";

    }
})

ipcMain.answerRenderer('watch-dir-clear', async (path: string) => {
    try {
        currentWatcher.get(path)?.close();
    } catch (e) {
        console.log(e)
    }
})

ipcMain
    .on('spawn', console.log)
    .on('get-stdout', console.log)
    .on('get', console.log);
