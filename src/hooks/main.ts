import { useEffect, useState } from 'react'
import { Session, EVENT, SESSION_STATUS } from '..'
import debug from 'debug'

const LOG = debug('carmel:hooks')

export const useCarmel = (config: any, dispatch: any = undefined) => {
  const [session, setSession] = useState<any>()
  const [loggedIn, setLoggedIn] = useState(false)
  const [ready, setReady] = useState(false)
  const [events, setEvents] = useState<any>([])
  const [newEvent, setNewEvent] = useState<any>()

  // const onNewEvent = (e: any) => {
  //     switch(e.type) {
  //       case EVENT.CONNECTED:
  //         return
  //       case EVENT.DATA_CHANGED:
  //         // setData({ _timestamp: Date.now(), ...session.data })
  //         return
  //       default:
  //     }
      
  //     setNewEvent(e)
  // }

  const init = async () => {
    // session.listen((type: EVENT, id: string, data: any) => {
    //   if (events.length === 0 || events[events.length - 1].id !== id) {
    //     onNewEvent({ type, id, data })
    //   }

    //   events.push({ type, id, data })
    // })

    // await session.start()
  }

  useEffect(() => {
    // setSession(new Session(config, dispatch))
  }, [])

  useEffect(() => {
    (async () => {
      // if (!session) return 
      // await init()
      // setReady(true)
    })()
  }, [session])

  return { 
    session, 
    events, 
    ready, 
    newEvent, 
    loggedIn, 
    // EVENT, 
    // SESSION_STATUS
  }
}
