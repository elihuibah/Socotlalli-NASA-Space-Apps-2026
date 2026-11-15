// Permite que Node (>= 22.6, con tipos borrados) importe los .ts del motor, que usan
// imports sin extensión como en Vite ("./mapping" -> "./mapping.ts").
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw err
    }
  },
})
