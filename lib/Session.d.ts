import { Cache, Gateway, IFunction, Chain, Drive, Identity, Station, SESSION_STATUS } from '.';
export declare class Session {
    private _id;
    private _revision;
    private _data;
    private _isBrowser;
    private _cache;
    private _status;
    private _config;
    private _listeners;
    private _dir;
    private _gateway;
    private _dispatch;
    private _identity;
    private _chain;
    private _station;
    private _drive;
    private _functions;
    constructor(config: any, dispatch?: any);
    get station(): Station;
    get functions(): {
        [id: string]: IFunction;
    };
    get chain(): Chain;
    get drive(): Drive;
    get identity(): Identity;
    get dir(): any;
    get revision(): string;
    get listeners(): any;
    get dispatch(): any;
    get config(): any;
    get id(): string;
    get gateway(): Gateway;
    get status(): SESSION_STATUS;
    get cache(): Cache;
    get data(): any;
    get isBrowser(): boolean;
    get isReady(): boolean;
    get isConnected(): boolean;
    save(): Promise<void>;
    load(): Promise<void>;
    init(): Promise<void>;
    close(): Promise<void>;
    setStatus(s: SESSION_STATUS): void;
    toJSON(): {
        id: string;
        cid: string;
    };
    registerFunctions(functions: any): Promise<void>;
    start(ipfs?: any): Promise<void>;
    stop(): Promise<void>;
}
