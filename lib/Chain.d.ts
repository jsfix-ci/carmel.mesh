import { Session } from './Session';
export declare class Chain {
    private _session;
    private _provider;
    private _config;
    constructor(session: Session);
    get session(): Session;
    get provider(): any;
    get config(): any;
    get isReadOnly(): boolean;
    get keys(): any;
    get account(): any;
    get type(): any;
    get url(): any;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    _fetchIdentity(username: string): Promise<any>;
    _fetchRelays(): Promise<string[]>;
    get fetch(): {
        relays: () => Promise<string[]>;
        identity: (username: string) => Promise<any>;
    };
    get op(): {
        system: (call: string, data: any, key?: string) => Promise<any>;
    };
}
