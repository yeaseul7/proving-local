import type { Notebook } from '../notebooks.ts';
import type { StoredStudyNote } from '../study-sync-client.ts';
export type StudyWorkspace = { notebooks:Notebook[]; closedIds:string[]; records:StoredStudyNote[] };
export type StudyOwner = {accountKey:string};
export type StudyChange = Record<string,unknown>;
export type StudyChangeResult = {record?:StoredStudyNote;publicId?:string|null};
export interface StudyStore {load(owner:StudyOwner):Promise<StudyWorkspace>;apply(owner:StudyOwner,change:StudyChange):Promise<StudyChangeResult>;}
