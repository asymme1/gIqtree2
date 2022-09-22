import { Codon, Codons, DataSettings, isMultipleGene, PartitionType, PartitionTypes, SequenceType, SequenceTypes } from "../../../../interfaces/dataSettings";
import { SettingCategoryCommonProp } from "./settingCategoryCommonProps";
import SettingRowFile from "../../../../component/settingrowfile";
import { MinusLogo, PlusLogo } from "../../../../icons";

function DataSetting({ settings, onChange }: SettingCategoryCommonProp<DataSettings>) {
    let multipleGenes = isMultipleGene(settings || {});
    let { alignmentFiles } = settings || {};
    if (alignmentFiles) {
        if (!alignmentFiles.filter(Boolean).length) {
            alignmentFiles = undefined;
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <b className="pb-2">
                    Sequence Type
                </b>
                <br />
                <select
                    className="px-1 py-2 w-full input-bordered bg-transparent"
                    onChange={e => onChange?.({
                        ...settings,
                        sequenceType: (e.target.value || undefined) as SequenceType | undefined
                    })}
                    value={settings?.sequenceType}>
                    {
                        [{ name: 'Auto-detect', type: undefined }, ...SequenceTypes]
                            .map(option => {
                                return (
                                    <option value={option.type}>
                                        {option.name}
                                    </option>
                                )
                            })
                    }
                </select>
            </div>
            {settings?.sequenceType === SequenceType.Codon && (
                <div>
                    <b className="pb-2">
                        Codon Type
                    </b>
                    <select
                        className="px-1 py-2 w-full input-bordered bg-transparent"
                        onChange={e => onChange?.({
                            ...settings,
                            codonType: (+e.target.value || undefined) as Codon | undefined
                        })}
                        value={settings?.codonType}>
                        {
                            Codons
                                .map(option => {
                                    return (
                                        <option value={option.type}>
                                            {option.name}
                                        </option>
                                    )
                                })
                        }
                    </select>
                </div>
            )}
            <div>
                <b className="pb-2">
                    Alignment file
                </b>
                <div className="flex flex-col gap-2">
                    {(alignmentFiles ?? [undefined])
                        .map((file, index) => {
                            return (
                                <div className="flex flex-row items-center gap-2" key={(file ?? '') + index}>
                                    <SettingRowFile
                                        isFile
                                        name="Alignment file/folder"
                                        file={file}
                                        onChange={file => {
                                            let newFiles = [...(settings?.alignmentFiles ?? [])];
                                            newFiles[index] = file;
                                            onChange?.({ ...settings, alignmentFiles: newFiles?.length ? newFiles : undefined })
                                        }}
                                        />
                                    {((settings?.alignmentFiles?.length ?? 0) > 1) && (
                                        <div className={index ? '' : 'invisible pointer-events-none'}>
                                            <button
                                                className="bg-pink-600 p-1 rounded-md"
                                                onClick={() => {
                                                    let newFiles = [...(settings?.alignmentFiles ?? [])];
                                                    newFiles.splice(index, 1);
                                                    onChange?.({ ...settings, alignmentFiles: newFiles })
                                                }}>
                                                <div className="h-6 w-6 mr-px">
                                                    <MinusLogo />
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    <div>
                                        <button
                                            className="bg-pink-600 p-1 rounded-md"
                                            onClick={() => {
                                                let newFiles = [...(settings?.alignmentFiles ?? [])];
                                                newFiles.splice(index + 1, 0, '');
                                                onChange?.({ ...settings, alignmentFiles: newFiles })
                                            }}>
                                            <div className="h-6 w-6 mr-px">
                                                <PlusLogo />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
            <div>
                <b className="pb-2">
                    Partition file
                </b>
                <SettingRowFile
                    isFile
                    name="Partition file"
                    file={settings?.partitionFile}
                    onChange={file => onChange?.({ ...settings, partitionFile: file })}
                    />
            </div>
            {multipleGenes && (
                <div>
                    <b className="pb-2">
                        Partition Type
                    </b>
                    <select
                        className="px-1 py-2 w-full input-bordered bg-transparent"
                        onChange={e => onChange?.({
                            ...settings,
                            partitionType: (e.target.value || undefined) as PartitionType | undefined
                        })}
                        value={settings?.partitionType}>
                        {
                            PartitionTypes
                                .map(option => {
                                    return (
                                        <option value={option.type}>
                                            {option.name}
                                        </option>
                                    )
                                })
                        }
                    </select>
                </div>
            )}
        </div>
    )
}

export default DataSetting;