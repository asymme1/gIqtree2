import {FSWatcher, watch} from 'chokidar';
import { readdir, stat } from 'fs';
import { basename, join } from 'path';
import { debounce } from "radash";
import { promisify } from 'util';

export class WatchDir {
    readonly path : string;
    private watcher : FSWatcher;
    constructor(path : string) {
        this.path = path;
        this.watcher = watch(this.path, {  ignorePermissionErrors: true });
    }

    close() {
        this.watcher?.close();
    }
    addListener(callback : (event : string, filename : string) => void) {
        this.watcher?.on('all', debounce({delay: 300}, callback));
    }
}
type Node = {
    id: string;
    path: string;
    children?: Node[];
    name: string;
    isFolder: boolean;
}
const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);

export async function recurseAsync(path: string) {
    const baseNode: Node = { id: path, name: basename(path), path, isFolder: false }
    try {
        performance.mark(`recurseAsync-start-${path}`);
        if ((await statAsync(path)).isDirectory()) {
            baseNode.isFolder = true;
            baseNode.children = await Promise.all((await readdirAsync(path))
                .map(dir => join(path, dir))
                .map(recurseAsync));
        }
        performance.mark(`recurseAsync-end-${path}`);
        performance.measure(`recurseAsync-${path}`, `recurseAsync-start-${path}`, `recurseAsync-end-${path}`);
    } catch (e: any) {
        if (e.code !== 'ENOENT') {
            // ENOENTs happen because the statSync call may run when the file is gone
            throw e;
        }
    }

    return baseNode;
}