import { Session } from '.'
import { Data, EVENT, SESSION_STATUS, SWARM_EVENT } from '.'
import debug from 'debug'
import * as eos from '@carmel/eos'
import { DEFAULT_URL } from '@carmel/eos/src'

const LOG = debug("carmel:server")
const eventlog = debug("carmel:events")

const MIN_OPERATORS_REQUIRED = 1
const DEFAULT_EOS_URL = "https://eos.greymass.com"

export const IPFS_BROWSER_CONFIG: any = (Swarm: string[], repo: string) => {
    return {
        start: true,
        init: true,
        repo,
        EXPERIMENTAL: {
            pubsub: true
        },
        relay: {
            enabled: true,
            hop: {
                enabled: true
            }
        },
        config: {       
            Addresses: {
                Swarm
            }
        }
    } as any
}

export const SYNC_INTERVAL = 1000
    
export class Server {
    private _cid: string 
    private _ipfs: any
    private _ctl: any
    private _isBrowser: boolean
    private _isOperator: boolean
    private _mesh: any
    private _listen: any
    private _onEventRequest: any
    private _onEventResponse: any
    private _session: Session
    private _syncTimer: any
    private _send: any
    public _push: any
    public _pull: any
    private sync: any
    private _connected: boolean
    private _sendQueue: any
    private _chain: any 
    
    constructor(session: Session) {
        this._session = session
        this._cid = ""
        this._isBrowser = (typeof window !== 'undefined')
        this._listen = this.listen.bind(this)
        this._onEventRequest = this.onEventRequest.bind(this)
        this._onEventResponse = this.onEventResponse.bind(this)
        this._connected = false 
        this._sendQueue = []
        this._isOperator = session.config.isOperator
        this._mesh = { operators: [], peers: [], relays: [] }
        this.sync = this._sync.bind(this)
        this._send = { _: this._sendRaw.bind(this) }
        this._push = this.push.bind(this)
        this._pull = this.pull.bind(this)
    }

    get connected () {
        return this._connected
    }

    get sendQueue() {
        return this._sendQueue
    }

    get chain() {
        return this._chain
    }

    get syncTimer () {
        return this._syncTimer
    }

    get session () {
        return this._session
    }

    get mesh () {
        return this._mesh
    }

    get ipfs () {
        return this._ipfs
    }

    get ctl () {
        return this._ctl
    }

    get cid () {
        return this._cid
    }

    get isBrowser() {
        return this._isBrowser
    }

    get isOperator () {
        return this._isOperator
    }

    get send () {
        return this._send
    }

    get isConnected() {
        return this._connected
    }

    stopSyncTimer() {
        if (!this.syncTimer) return 

        clearInterval(this.syncTimer)
    }

    async _sync () {
        this._mesh.operators = []
        this._mesh.peers = []
        this._connected = false

        const ipfsPeers = await this.ipfs.swarm.peers() || []
        const carmelOperators = await this.ipfs.pubsub.peers(`#carmel:events:req:${SWARM_EVENT.ACCEPT.toLowerCase()}`) || []

        this._mesh.peers = ipfsPeers.map((p: any) => p.peer)

        if (!carmelOperators || carmelOperators.length < MIN_OPERATORS_REQUIRED) {
            LOG(`looking for Carmel Operators [found=${carmelOperators.length} required=${MIN_OPERATORS_REQUIRED}]`)
            return 
        }

        this._mesh.operators = carmelOperators
        this._connected = true

        this.session.onEvent(EVENT.CONNECTED, this.mesh)

        LOG(`connected to the Carmel Mesh [operators=${this.mesh.operators.length} peers=${this.mesh.peers.length} relays=${this.mesh.relays.length}]`)

        this.mesh.operators.map((s: string, i: number) => LOG(`   operator ${i}: ${s}`))
        this.mesh.relays.map((s: string, i: number) => LOG(`   relay ${i}: ${s}`))
        this.mesh.peers.map((s: string, i: number) => LOG(`   peer ${i}: ${s}`))

        await this.flushSendQueue()
    }

    async flushSendQueue () {
        this._sendQueue = await this.session.cache.get("session/sendqueue") || []

        if (this.sendQueue.length === 0) return 

        LOG(`flushing send queue [events=${this.sendQueue.length}]`)

        await Promise.all(this.sendQueue.map((m: any) => this.send._(m.type, m.event, m.isResponse)))

        this._sendQueue = []
        await this.session.cache.put("session/sendqueue", [])

        LOG(`send queue completely flushed`)
    }

    async addToSendQueue(e: any) {
        this._sendQueue = await this.session.cache.get("session/sendqueue") || []
        this.sendQueue.push(e)
        await this.session.cache.put("session/sendqueue", this.sendQueue)
    }        

    startSyncTimer() {  
        this._syncTimer = setInterval(async () => {
           if (this.isConnected) {
               this.stopSyncTimer()
               return
           }

           await this.sync()
        }, SYNC_INTERVAL)
    }

    async ls (location?: string) {
        if (!this.ipfs) return 

        let result: any = []
        for await (const file of this.ipfs.files.ls(`/carmel${location ? '/' + location: ''}`)) {
            result.push(file)
        }

        return result
    }

    async open (id: string) {
        if (!this.ipfs) return
        let content = ""

        try {
            for await (const chunk of this.ipfs.files.read(`/carmel/${id}.json`)) {
                content = `${content}${Buffer.from(chunk).toString()}`
            }

            LOG(`opened content [id=${id}]`)
            
            return JSON.parse(content)
        } catch {
        }
    }

    async pull (id: string, cid: string) {
        if (!this.ipfs) return

        try {
            // Remove the old file if present
            await this.ipfs.files.rm(`/carmel/${id}.json`, { recursive: true })
            LOG(`removed content [id=${id}]`)
        } catch {
        }

        try {
            await this.ipfs.files.cp(`/ipfs/${cid}`, `/carmel/${id}.json`)

            LOG(`pulled content [id=${id} cid=${cid}]`)

            return this.open(id)
        } catch {
        }
    }

    async push (id: string, data: any) {
        LOG(`pushing ${id} ...`)

        if (!this.ipfs) return

        const content: string = JSON.stringify({
            timestamp: Date.now(),
            id,    
            data
        })

        LOG("content:", content)

        try {
            // Remove the old file if present
            await this.ipfs.files.rm(`/carmel/${id}.json`, { recursive: true })
            LOG(`removed content [id=${id}]`)
        } catch {
        }

        await this.ipfs.files.write(`/carmel/${id}.json`, new TextEncoder().encode(content), { create: true })

        const result = await this.ls(`${id}.json`)

        if (!result || result.length !== 1) {
            return
        }

        const cid = result[0].cid.toString()
        await this.ipfs.pin.add(cid)

        LOG(`pushed content [id=${id} cid=${cid}]`)

        return ({
            cid,
            size: result[0].size,
            path: `/carmel/${id}.json`,
            id
        })
    }

    async onEventRequest (type: string, event: any, session: Session) {
        LOG(`<- received [${type}] request`)

        const handler: any = session.handlers[`${type.toLowerCase()}` as keyof typeof session.handlers]
        
        if (!handler) {
            LOG(`   [ skipped ] could not find event handler`)
            return 
        } 

        // Handle it
        const result = await handler.request({ session, event, eventlog })

        // Send the result back
        this.send[type.toLowerCase()](result)
    }

    async onEventResponse (type: string, event: any, session: Session) {
        LOG(`<- received [${type}] response`)

        const handler: any = session.handlers[`${type.toLowerCase()}` as keyof typeof session.handlers]
        
        if (!handler) {
            LOG(`   [ skipped ] could not find event handler`)
            return 
        } 

        // Handle it
        await handler.response({ session, event, eventlog })
    }

    async _sendRaw (type: string, event: any, isResponse: boolean = false) {
            if (!this.ipfs) return

        const fullType = `${isResponse ? 'res': 'req'}:${type}`.toLowerCase()

        if (!this.isOperator && !this.isConnected) {
            LOG(`-> delaying event until connection is established [${fullType}]`)
            await this.addToSendQueue({ type, event, isResponse })
            return 
        }

        this.ipfs.pubsub.publish(`#carmel:events:${fullType}`, JSON.stringify(event || {}))

        LOG(`-> sent [${type.toLowerCase()}] ${isResponse ? 'response' : 'request'}`)
    }

    async listen(type: string, response: boolean = false) {
        LOG(`listening for [${type.toLowerCase()}] ${response ? 'responses' : 'requests'}`)

        const fullType = `${response ? 'res': 'req'}:${type}`.toLowerCase()

        this.ipfs.pubsub.subscribe(`#carmel:events:${fullType}`, (message: any) => {
            try {
                const { from, data } = message
                const e = data.toString()
                if (from === this.cid) return 
                response ? this._onEventResponse(type.toLowerCase(), JSON.parse(e), this.session) : this._onEventRequest(type.toLowerCase(), JSON.parse(e), this.session)
            } catch (err: any) {}
        })
    }

    async resolveRelays () {
        if (this.mesh.relays.length > 0) {
            return 
        }

        LOG(`resolving relays ...`)
        this._mesh.relays = [] 

        const relays = [{
            type: "webrtc-star",
            url: "carmel-relay0.chunky.io",
            port: 443
        }]

        this._mesh.relays = relays.filter((s: any) => s.type === 'webrtc-star').map((s: any) => `/dns4/${s.url}/tcp/${s.port || 443}/wss/p2p-webrtc-star`)

        LOG(`resolved relays (${this.mesh.relays.length})`)        
        this.mesh.relays.map((s: string, i: number) => LOG(`   relay ${i}: ${s}`))

        return this.mesh.relays
    }

    async startIPFS (ipfs?: any) {
        try {
            if (!this.mesh || !this.mesh.relays) return 
    
            if (this.isBrowser) {
                const ipfsLib = require('ipfs')
                this._ipfs = await ipfsLib.create(IPFS_BROWSER_CONFIG(this.mesh.relays, `${this.session.cache.root}/ipfs`))
                return
            }

            if (!ipfs) {
                return
            }

            this._ipfs = ipfs!.api
        } catch (e: any) {
            LOG(`Could not start IPFS [Error: ${e.message}]`)
        }
    }

    async connectToEOS() {       
        if (this.session.config.eos) {
            this._chain = {
                account: this.session.config.eos.keys.main.id, 
                ...eos.chain({
                    url: this.session.config.eos.url || DEFAULT_EOS_URL,
                    keys: this.session.config.eos.keys,
                })
            }

            LOG(`connected to EOS [account=${this.chain.account}]`)

            return
        }

        this._chain = {
            ...eos.anonChain({ url: DEFAULT_URL })
        }
    }

    get _ () {
        return {
            getId: (username: string) => eos.getId(this.chain, username),
            system: async (action: string, data: any, key: string = 'main') => eos.system(this.chain, action, data, key)
        }
    }

    async start(ipfs?: any) {        
        LOG(`starting [browser=${this.isBrowser}]`)

        await this.resolveRelays()
        await this.startIPFS(ipfs)

        if (!this.ipfs) return 

        const { id } = await this.ipfs.id()
        this._cid = id 

        await Promise.all(Object.keys(SWARM_EVENT).map((e: string) => {
            // Operators send responses and non-operators send requests
            this._send[e.toLowerCase()] = async (props: any) => this._sendRaw(e, props || {}, this.isOperator)

            // Operators listen for event requests
            this.isOperator && this._listen(e)

            // Non-operators listen for event responses
            this.isOperator || this._listen(e, true)
        }))

        await this.ipfs.files.mkdir('/carmel', { parents: true })

        LOG(`started ${this.isOperator ? 'as operator ': ''}[cid=${this.cid} browser=${this.isBrowser}]`)

        await this.connectToEOS()

        if (this.isOperator) {
            return
        }

        this.startSyncTimer()
        this.sync()
    }

    async stop () {
        this.stopSyncTimer()
    }
}