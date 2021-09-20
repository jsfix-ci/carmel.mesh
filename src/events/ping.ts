export const request = async ({ session, event, eventlog }: any) => {
    eventlog("[ping request]:", event)
    return "World"
}

export const response = async ({ session, event, eventlog }: any) => {
    eventlog("[ping response]:", event)
}