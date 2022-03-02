import { Session } from './Session';
export declare class Drive {
    static ROOT: string;
    private _session;
    _push: any;
    _pull: any;
    constructor(session: Session);
    get session(): Session;
    get ipfs(): any;
    ls(location?: string): Promise<any>;
    open(id: string): Promise<any>;
    pull(id: string, cid: string): Promise<any>;
    _readDir(dir: string): Promise<any[]>;
    pushDir(dir: string, base: string): Promise<any>;
    push(id: string, data: any): Promise<{
        cid: any;
        size: any;
        path: string;
        id: string;
    } | undefined>;
    mount(): Promise<void>;
    unmount(): Promise<void>;
}
