import {  useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import { readdir, readdirSync, stat, statSync} from 'fs';
import { basename, join } from 'path';
import useResize from 'use-resize-observer';
import { diff } from 'deep-object-diff';
import { promisify } from 'util';
import { ipcRenderer } from 'electron-better-ipc';

type Node = {
    id: string;
    path: string;
    children?: Node[];
    name: string;
    isFolder: boolean;
}

function recurse(path: string) {
    const baseNode: Node = { id: path, name: basename(path), path, isFolder: false }

    try {
        performance.mark(`recurse-start-${path}`);
        if (statSync(path).isDirectory()) {
            baseNode.isFolder = true;
            baseNode.children = readdirSync(path)
                .map(dir => join(path, dir))
                .map(recurse);
        }
        performance.mark(`recurse-end-${path}`);
        performance.measure(`recurse-${path}`, `recurse-start-${path}`, `recurse-end-${path}`);
    } catch (e: any) {
        if (e.code !== 'ENOENT') {
            // ENOENTs happen because the statSync call may run when the file is gone
            throw e;
        }
    }

    return baseNode;
}
const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);

async function recurseAsync(path: string) {
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

function useTreeIPC(path: string) : [Node, (arg0: string) => void] {

    const [tree, setTree] = useState<Node>({
        id: path,
        name: basename(path),
        path: path,
        isFolder: true
    })
    const [_pathname, _setPath] = useState<string>(path);
    const updateTree = (node : Node) => {
        performance.mark(`updateTree-start`);
        setTree(node)
        performance.mark(`updateTree-end`);
        performance.measure(`updateTree`, `updateTree-start`, `updateTree-end`);
    }

    useEffect(() => {
        (async () => {
            performance.mark("watch-dir-start");
            await ipcRenderer.callMain('watch-dir', _pathname)
            performance.mark("watch-dir-update-start");
            ipcRenderer.answerMain('watch-dir-update', updateTree)
        })()

        return () => {
            performance.mark("watch-dir-end");
            performance.measure("watch-dir", "watch-dir-start", "watch-dir-end");
            ipcRenderer.callMain('watch-dir-clear', _pathname)
            performance.mark("watch-dir-update-end");
            performance.measure("watch-dir-update", "watch-dir-update-start", "watch-dir-update-end");
            ipcRenderer.removeListener('watch-dir-update', updateTree)
        }
    }, [_pathname]);
    const setPath = (path : string) => {
        setPath(path);
    }
    return [tree, setPath];
}



function useTreeSync(path: string) : [Node, (arg0: string) => void] {

    const [tree, setTree] = useState<Node>({
        id: path,
        name: basename(path),
        path: path,
        isFolder: true
    })
    const [_pathname, _setPath] = useState<string>(path);
    const updateTree = (node : Node) => {
        setTree(node)
    }


    useEffect(() => {
        setTree(recurse(_pathname))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_pathname])

    const getCurrentTree = () => {
        return tree;
    }
    useEffect(() => {
        let interval = setInterval(() => {
            performance.mark('recurseSync-start');
            let current = recurse(_pathname);
            performance.mark('recurseSync-end');
            performance.measure('recurseSync', 'recurseSync-start', 'recurseSync-end');
            if (Object.keys(diff(getCurrentTree(), current)).length)
                updateTree(current);
        }, 1500);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_pathname]);

    const setPath = (path : string) => {
        setPath(path);
    }
    return [tree, setPath];
}


function useTreeAsync(path: string) : [Node, (arg0: string) => void] {

    const [tree, setTree] = useState<Node>({
        id: path,
        name: basename(path),
        path: path,
        isFolder: true
    })
    const [_pathname, _setPath] = useState<string>(path);
    const updateTree = (node : Node) => {
         setTree(node)
    }


    useEffect(() => {
        (async () => {
            setTree(await recurseAsync(_pathname))
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_pathname])

    const getCurrentTree = () => {
        return tree
    }

    useEffect(() => {
        let interval = setInterval(async () => {
            performance.mark('recurseAsync-start');
            let current = await recurseAsync(_pathname);
            performance.mark('recurseAsync-end');
            performance.measure('recurseAsync', 'recurseAsync-start', 'recurseAsync-end');
            if (Object.keys(diff(getCurrentTree(), current)).length)
                updateTree(current);
        }, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_pathname]);

    const setPath = (path : string) => {
        setPath(path);
    }
    return [tree, setPath];
}

function Sidebar(
    { projectPath, currentFile, onFileChosen }:
    { projectPath: string, currentFile?: string, onFileChosen?: (f: string) => void }
) {
    let [treeHeight, setTreeHeight] = useState(0);
    let [treeWidth, setTreeWidth] = useState(0);

    let [tree, setPath] = useTreeIPC(projectPath)


    let { ref: treeRef } = useResize({
        onResize({ height, width }) {
            if (height) setTreeHeight(height);
            if (width) setTreeWidth(width);
        }
    })

    return (
        <div className="ml-2 h-full" ref={treeRef}>
            <Tree
                data={tree}
                width={Math.max(treeWidth, window.visualViewport!.width / 7)}
                height={Math.max(treeHeight, window.visualViewport!.height * 4 / 5)}
                rowHeight={30} className='h-full'>
                {({ styles, data }) => {
                    let clickable = !data.isFolder && !data.name.endsWith('.gz');
                    return (
                        <div
                            className={
                                (data.path === currentFile ? 'bg-gray-200' : '')
                                + (clickable ? ' cursor-pointer' : ' text-gray-400')
                            }
                            style={styles.row}
                            key={data.id}
                            onClick={() => {
                                if (clickable)
                                    onFileChosen?.(data.path);
                            }}
                            >
                            <div 
                                style={{...styles.indent, height: '100%'}} >
                                {data.name}
                            </div>
                        </div>
                    )
                }}
            </Tree>
        </div>
    )
}

export default Sidebar;