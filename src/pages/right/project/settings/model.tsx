import BinaryOptions from "../../../../component/binaryoptions";
import { SequenceType } from "../../../../interfaces/dataSettings";
import { AutoMergePartitions, AutoMergePartitionsAlgorithms, getAvailableFrequencies, ModelSettings, RHASModel, RHASModels, StateFrequency, SubstitutionModel, SubstitutionModels } from "../../../../interfaces/modelSettings";
import { SettingCategoryCommonProp } from "./settingCategoryCommonProps";

function Model({ settings, onChange, sequenceType, isMultipleGene }: SettingCategoryCommonProp<ModelSettings> & {
    sequenceType: SequenceType | undefined,
    isMultipleGene: boolean
}) {
    let { proportionOfInvariableSites, ascertainmentBiasCorrection } = settings ?? {};
    let availableModels: (SubstitutionModel | undefined)[] = SubstitutionModels
        .filter(e => e.sequenceType === sequenceType || sequenceType === undefined)
        .map(e => e.models)
        .flat();
    availableModels.unshift(undefined);

    let availableFrequencies = getAvailableFrequencies(sequenceType);

    return (
        <div className="flex flex-col gap-6">
            {isMultipleGene && (
                <div>
                    <b className="pb-2">
                        Auto merge partitions
                    </b>
                    <br />
                    <select
                        className="px-1 py-2 w-full input-bordered bg-transparent"
                        onChange={e => onChange?.({
                            ...settings,
                            autoMergePartitions: (e.target.value || undefined) as AutoMergePartitions | undefined
                        })}
                        value={settings?.autoMergePartitions}>
                        {
                            [{ name: 'None', type: undefined }, ...AutoMergePartitionsAlgorithms]
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
                    Subtitution model
                </b>
                <br />
                <select
                    className="px-1 py-2 w-full input-bordered bg-transparent"
                    onChange={e => onChange?.({
                        ...settings,
                        substitutionModel: (e.target.value || undefined) as SubstitutionModel | undefined
                    })}
                    value={settings?.substitutionModel}>
                    {
                        availableModels
                            .map(option => {
                                return (
                                    <option value={option}>
                                        {option ?? 'Automatic'}
                                    </option>
                                )
                            })
                    }
                </select>
            </div>
            <div>
                <b className="pb-2">
                    Allow proportion of invariable sites
                </b>
                <br />
                <BinaryOptions
                    value={proportionOfInvariableSites ?? false}
                    truthyText="On"
                    falsyText="Off"
                    onChange={v => onChange?.({ ...settings, proportionOfInvariableSites: v })} />
            </div>
            <div>
                <b className="pb-2">
                    RHAS model
                </b>
                <br />
                <select
                    className="px-1 py-2 w-full input-bordered bg-transparent"
                    onChange={e => onChange?.({
                        ...settings,
                        rhasModel: (e.target.value || undefined) as RHASModel | undefined
                    })}
                    value={settings?.substitutionModel}>
                    {
                        [{ name: 'None', type: undefined }, ...RHASModels]
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
            <div>
                <b className="pb-2">
                    State frequency
                </b>
                <br />
                <select
                    className="px-1 py-2 w-full input-bordered bg-transparent"
                    onChange={e => onChange?.({
                        ...settings,
                        stateFrequency: (e.target.value || undefined) as StateFrequency | undefined
                    })}
                    value={settings?.substitutionModel}>
                    {
                        [{ name: 'None', type: undefined }, ...availableFrequencies]
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
            <div>
                <b className="pb-2">
                    Ascertainment bias correction
                </b>
                <br />
                <BinaryOptions
                    value={ascertainmentBiasCorrection ?? false}
                    truthyText="On"
                    falsyText="Off"
                    onChange={v => onChange?.({ ...settings, ascertainmentBiasCorrection: v })} />
            </div>
        </div>
    )
}

export default Model;