import findModel from './findModel';
import mergePartitions from './mergePartitions';
import inferTree from './inferTree';
import assessSupport from './assessSupport';
import dateTree from './dateTree';

import base from './default';
import { Settings } from '../interfaces';
import { merge } from 'merge-anything';

export enum TemplateType {
    FindModel = 1,
    MergePartitions,
    InferTree,
    AssessSupport,
    DateTree
}


export function getTemplateSettings(type?: TemplateType) : Settings {
    let def = base();
    switch (type) {
        case TemplateType.FindModel:
            return merge(def, findModel()) as Settings;
        case TemplateType.MergePartitions:
            return merge(def, mergePartitions()) as Settings;
        case TemplateType.InferTree:
            return merge(def, inferTree()) as Settings;
        case TemplateType.AssessSupport:
            return merge(def, assessSupport()) as Settings;
        case TemplateType.DateTree:
            return merge(def, dateTree()) as Settings;
        default:
            return def;
    }
}