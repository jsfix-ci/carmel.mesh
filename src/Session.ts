import { nanoid } from 'nanoid'
import { 
    Cache, 
    Data,
    IListener,
    Gateway,
    IFunction,
    Chain, 
    Drive,
    Identity,
    Station,
    EVENT,
    SESSION_STATUS
} from '.'
import debug from 'debug'

const LOG = debug("carmel:session")

export class Session {
    private _id: string 
    private _revision: string 
    private _data: any
    private _isBrowser: boolean
    private _cache: Cache
    private _status: SESSION_STATUS
    private _config: any
    private _listeners: any
    private _dir: any
    private _gateway: Gateway
    private _dispatch: any
    private _handlers: any 
    private _identity: Identity
    private _chain: Chain
    private _station: Station 
    private _drive: Drive 
    private _functions: { [id: string]: IFunction }

    constructor(config: any, dispatch: any = undefined) {
        this._config = config || {}
        this._dispatch = dispatch
        this._isBrowser = (typeof window !== 'undefined')
        this._cache = new Cache(this.isBrowser, this.config.root)
        this._data = { account: new Data(this, 'account') }
        this._status = SESSION_STATUS.NEW
        this._gateway = new Gateway(this)
        this._id = ""
        this._chain = new Chain(this)
        this._drive = new Drive(this) 
        this._station = new Station(this)
        this._handlers = this.config.handlers || {}
        this._revision = this.config.revision || `N/A-${Date.now()}`
        this._listeners = []     
        this._functions = {}
    
        Object.keys(this.config.data || {}).map(async (slice: string) => this._data[slice] = new Data(this, slice))

        this._identity = new Identity(this)
    }

    get station () {
        return this._station
    }

    get functions () {
        return this._functions
    }

    get chain () {
        return this._chain 
    }

    get drive () {
        return this._drive
    }
 
    get identity() {
        return this._identity
    }

    get dir () { 
        return this._dir
    }

    get handlers () {
        return this._handlers
    }

    get revision () {
        return this._revision
    }

    get listeners() {
        return this._listeners
    }

    get dispatch () {
        return this._dispatch
    }

    get config() { 
        return this._config
    }

    get id() {
        return this._id
    }

    get gateway () {
        return this._gateway
    }

    get status() {
        return this._status
    }

    get cache() {
        return this._cache
    }
    
    get data() {
        return this._data
    }

    get isBrowser() {
        return this._isBrowser
    }

    get isReady() {
        return this.status >= SESSION_STATUS.READY
    }

    get isConnected() {
        return this.status >= SESSION_STATUS.CONNECTED
    }

    async save() {
        await this.cache.put(`session/id`, this.id)
        await Promise.all(Object.keys(this.data || {}).map(async (slice: string) => this.data[slice].save()))
    }

    async load() {
        this._id = await this.cache.get(`session/id`) || nanoid()
        await Promise.all(Object.keys(this.data || {}).map(async (slice: string) => this.data[slice].init()))
    }

    async init () {
        await this.load() 
        await this.save()
    }

    async close () {
        await this.cache.close()
    }

    listen(onEvent: any) {
        this.listeners.push(<IListener>{ onEvent })
    }

    onEvent(type: EVENT, data: any) {
        this.listeners.map((listener: IListener) => {
            listener.onEvent(type, nanoid(), data)
        })
    }

    setStatus(s: SESSION_STATUS) {
        LOG(`changed status [status=${s}]`)

        this._status = s
        this.onEvent(EVENT.STATUS_CHANGED, s)
    }

    toJSON() {
        return ({
            id: this.id,
            cid: this.id
        })
    }

    async registerFunctions (functions: any) {
       if (!functions) return 

       for (let id in functions) {
           const f: any = functions[id]
           
           if ("object" !== typeof f || !f || !f.handler) continue

           this._functions[id] = f
       }
    }

    async start(ipfs?: any) {
        LOG(`starting [revision=${this.revision} operator=${this.config.isOperator}]`)
        this.setStatus(SESSION_STATUS.INITIALIZING)

        await this.init()
        await this.chain.connect()

        await this.gateway.start(ipfs)
        await this.save()
        await this.drive.mount()
        await this.station.start()

        this.setStatus(SESSION_STATUS.READY)
    }

    async stop () {
        LOG(`stopping [revision=${this.revision}]`)
        this.setStatus(SESSION_STATUS.STOPPING)

        await this.save()

        await this.station.stop()
        await this.gateway.stop()
        await this.drive.unmount()

        await this.chain.disconnect()
        await this.close()

        this.setStatus(SESSION_STATUS.STOPPED)
    }
}