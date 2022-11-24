import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { diff } from 'deep-object-diff';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faForward, faSliders, faTerminal } from '@fortawesome/free-solid-svg-icons'
import { faCirclePlay, faFolder, faFloppyDisk } from '@fortawesome/free-regular-svg-icons'
import { ipcRenderer } from 'electron-better-ipc';
import { ChildProcess } from 'child_process';
import { basename, join } from 'path';
import { readFileSync } from 'fs';

import ProjectSetting from './settings';
import Copy from './copy';

import type { Settings } from '../../interfaces';
import { readSettingsFileSync, writeSettingsFileSync } from '../../utils/settingsFile';
import { prepareCommand } from '../../command';
import { getOutputFolder, getInputFolder } from './projectFolder';
import { getBinaryPath } from '../../platform';
import listDependentFileEntries from '../../utils/listDependentFileEntries';
import remap from '../../utils/remapInputFiles';
import Sidebar from './sidebar';
import MainContent from './mainContent';

enum CurrentScreen {
    Main = 1,
    Setting = 2,
    Copy = 3
}


function Project({ onOpenProject } : { onOpenProject?: (path: string) => void }) {
    let [searchParams] = useSearchParams();
    let [settings, setSettings] = useState<Settings | null>(null);
    let [currentScreen, setCurrentScreen] = useState(CurrentScreen.Main);
    let [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
    let [error, setError] = useState<string>('');
    let [executing, setExecuting] = useState(false);
    let [currentFile, setCurrentFile] = useState<string | undefined>();
    let [currentContent, setCurrentContent] = useState('');
    // let [logRef, setLog] = useState<string[]>([]);
    let logRef = useRef<string[]>([])

    const openSetting = currentScreen === CurrentScreen.Setting;
    const copying = currentScreen === CurrentScreen.Copy;
    const path = searchParams.get('path')!

    useEffect(() => onOpenProject?.(path), [onOpenProject, path]);

    useEffect(() => {
        try {
            let setting = readSettingsFileSync(path);
            setSettings(setting);
            setOriginalSettings(setting);
        } catch (e) {
            setError(`${e}`)
        }
    }, [path]);

    const getCurrentLog = () => {
        return logRef.current
    }
    useEffect(() => {
        let interval = setInterval(async () => {
            let result: string[] | false = await ipcRenderer.callMain('get-stdout', path);
            if (result) {
                if (JSON.stringify(result) !== JSON.stringify(getCurrentLog())) {
                    logRef.current = result;
                }
            }

            let processes: { process: ChildProcess }[] | false = await ipcRenderer.callMain('get', path);
            if (processes) {
                setExecuting(processes.some(p => p.process.exitCode === null && !p.process.signalCode));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (currentFile) {
            try {
                setCurrentContent(readFileSync(currentFile, 'utf8'));
                setError('');
            }
            catch (e) {
                setError(`${e}`);
            }
        }
    }, [currentFile]);

    if (error) {
        return (
            <div>
                Error occurred :
                <br />{error}
            </div>
        )
    }

    let preparedCommand : string[][] = [], preparedCommandWithRedo : string[][] = [];
    if (settings && originalSettings) {
        preparedCommand = prepareCommand(originalSettings, 'output', getOutputFolder(path));
        preparedCommandWithRedo = prepareCommand(originalSettings, 'output', getOutputFolder(path), true);
    }

    let main : React.ReactElement | null;
    switch (currentScreen) {
        case CurrentScreen.Copy: {
            main = (
                <Copy
                    files={
                        listDependentFileEntries(settings!)
                            .map(f => {
                                return {
                                    source: f,
                                    destination: join(getInputFolder(path), basename(f))
                                }
                            })
                    }
                    onReady={(copied) => {
                        let remapped = remap(settings!, copied);
                        writeSettingsFileSync(path, remapped)
                        setOriginalSettings(remapped);
                        setSettings(remapped);
                        setCurrentScreen(CurrentScreen.Main)
                    }} />
            );
            break;
        }
        case CurrentScreen.Setting: {
            main = settings
                ? <ProjectSetting setting={settings} onChange={setting => setSettings(setting)} />
                : null;
            break;
        }
        default: {
            main = (
                <MainContent content={error ? error : currentFile ? currentContent : logRef.current.join('\n\n')} />
            );
            break;
        }
    }

    return (
        <div className='pt-1 grow flex flex-col relative'>
            <div className={
                'sticky py-2 top-10 flex flex-row justify-between z-30 bg-white drop-shadow-md border-b '
                + (openSetting ? 'border-black' : 'border-transparent')
            }>
                <div className='flex flex-row items-center gap-4 text-2xl font-bold pl-4'>
                    {!settings?.name && <FontAwesomeIcon icon={faFolder} className='h-8' />}
                    <div>{settings?.name ?? basename(path)}</div>
                </div>
                <div className={
                    'grid gap-2 pr-2 justify-end items-center'
                    + (settings && openSetting ? ' grid-cols-6' : ' grid-cols-5')
                }>
                    <button
                        className={
                            'top-bar-button col-span-1 hover:border-cyan-500 hover:bg-cyan-200 '
                            + 'active:bg-cyan-700 active:text-white active:border-cyan-800 '
                            + (openSetting ? 'border-cyan-200 bg-cyan-100' : '')
                        }
                        onClick={() => setCurrentScreen(
                            currentScreen === CurrentScreen.Setting ? CurrentScreen.Main : CurrentScreen.Setting
                        )}>
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faSliders} className='top-bar-button-icon' />
                        </div>
                        <div>Settings</div>
                        <div></div>
                    </button>
                    {settings && openSetting && (
                        <button
                            disabled={!Object.keys(diff(originalSettings ?? {}, settings ?? {})).length || copying}
                            className='top-bar-button col-span-1 hover:border-gray-500 hover:bg-gray-100 active:border-black active:text-white'
                            onClick={() => {
                                if (settings) writeSettingsFileSync(path, settings)
                                setOriginalSettings(settings);
                                setCurrentScreen(CurrentScreen.Copy);
                            }}>
                            <div className='flex items-center'>
                                <FontAwesomeIcon icon={faFloppyDisk} className='top-bar-button-icon' />
                            </div>
                            <div>
                                {copying ? 'Copying files...' : 'Save'}
                            </div>
                            <div></div>
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setCurrentScreen(CurrentScreen.Main);
                            setCurrentFile(undefined);
                        }}
                        disabled={currentFile === undefined}
                        className='top-bar-button col-span-1 top-bar-button-colored'>
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faTerminal} className='top-bar-button-icon' />
                        </div>
                        <div>Log</div>
                        <div></div>
                    </button>
                    <button
                        className='top-bar-button col-span-1 top-bar-button-colored'
                        disabled={executing || copying}
                        onClick={async () => {
                            // remove all checkpoints
                            await ipcRenderer.callMain('spawn', {
                                id: path,
                                arguments: preparedCommand,
                                binary: getBinaryPath()
                            });
                            setExecuting(true);
                            setCurrentScreen(CurrentScreen.Main);
                        }}>
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faCirclePlay} className='top-bar-button-icon' />
                        </div>
                        <div>
                            {executing ? 'Executing...' : (openSetting ? 'Execute' : 'Execute / Restart')}
                        </div>
                        <div></div>
                    </button>
                    <button
                        onClick={() => {
                            ipcRenderer.callMain('kill', path);
                        }}
                        disabled={!executing || copying}
                        className='top-bar-button col-span-1 top-bar-button-colored'>
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faPause} className='top-bar-button-icon' />
                        </div>
                        <div>Pause</div>
                        <div></div>
                    </button>
                    <button
                        className='top-bar-button col-span-1 top-bar-button-colored'
                        disabled={executing || copying}
                        onClick={async () => {
                            await ipcRenderer.callMain('spawn', {
                                id: path,
                                arguments: preparedCommandWithRedo,
                                binary: getBinaryPath()
                            });
                            setExecuting(true);
                            setCurrentScreen(CurrentScreen.Main);
                        }}>
                        <div className='flex items-center'>
                            <FontAwesomeIcon icon={faForward} className='top-bar-button-icon' />
                        </div>
                        <div>Continue</div>
                        <div></div>
                    </button>
                </div>
            </div>
            <div className='grow flex flex-row gap-2'>
                <Sidebar
                    projectPath={path}
                    currentFile={currentFile}
                    onFileChosen={f => setCurrentFile(f)}
                    />
                <div className='grow'>
                    {main}
                </div>
            </div>
        </div>
    )
}

export default Project;