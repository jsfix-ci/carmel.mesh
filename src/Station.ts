import { Session, Channel } from '.'
import debug from 'debug'

const LOG = debug("carmel:chain")

export class Station {
    
    private _session: Session
    private _channels: { [id: string]: Channel }

    constructor(session: Session) {
        this._session = session
        this._channels = {}
    }

    get session () {
        return this._session
    }

    get channels () {
        return this._channels
    }

    get defaultChannels () {
        return [Channel.SYSTEM_MAIN_ID].concat(this.session.config.isOperator ? [Channel.SYSTEM_OPERATORS_ID] : [])
    }

    get initialChannels () {
        // TODO add channel filtering
        return (this.session.config.channels || [])
    }

    channel (id: string) {
        return this.channels[id]
    }

    async flush() {
        await Promise.all(Object.values(this.channels).map((channel: Channel) => channel.flush()))
    }

    async joinChannel(id: string) {
        if (this.channels[id]) return this.channels[id]

        LOG(`joining channel [id=${id}] ...`)

        const channel = new Channel(id, this)
        await channel.open()

        this.channels[id] = channel

        LOG(`joined channel [id=${this.channels[id]}]`)

        return this.channels[id]
    }

    async leaveChannel(id: string) {
        if (!this.channels[id]) return

        LOG(`leaving channel [id=${id}] ...`)

        await this.channels[id].close()
        delete this.channels[id]

        LOG(`left channel [id=${this.channels[id]}]`)
    }

    async start () {
        LOG("starting the station ...")

        await Promise.all(this.defaultChannels.concat(this.initialChannels).map(this.joinChannel))

        LOG("started the station")
    }

    async stop () {
        LOG("stopping the station ...")

        await Promise.all(Object.keys(this.channels).map(this.leaveChannel))

        LOG("stopped the station")
    }    
}