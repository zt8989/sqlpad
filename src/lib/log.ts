export const log = {
  dubug(...args: Parameters<typeof console.debug>){
    return console.debug.apply(console, args)
  },
  error(...args: Parameters<typeof console.error>){
    return console.error.apply(console, args)
  }
}