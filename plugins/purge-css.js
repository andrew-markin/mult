/* eslint-disable import-x/no-nodejs-modules */
import { createHash } from 'node:crypto'

import { PurgeCSS } from 'purgecss'

// Quasar ships the styles of all its components in one stylesheet, while the app uses
// a few of them. Drops the rules whose selectors appear nowhere in the built scripts and
// pages, which are what actually runs, so components added later keep their styles.
// Classes put together at runtime, like bg-${color}, can't be found there and are to be
// listed in the safelist.
export default function purgeCss({ safelist = [] } = {}) {
  return {
    name: 'purge-css',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_, bundle) {
      const files = Object.values(bundle)
      const referrers = files.filter(({ fileName }) => /\.(js|html)$/.test(fileName))
      const content = referrers.map(({ fileName, code, source }) => ({
        raw: String(code ?? source),
        extension: fileName.split('.').pop()
      }))
      for (const file of files.filter(({ fileName }) => fileName.endsWith('.css'))) {
        const [{ css }] = await new PurgeCSS().purge({
          content,
          css: [{ raw: String(file.source) }],
          safelist
        })
        // The name has to change along with the content, as the service worker caches
        // files with hashed names by their names alone
        const hash = createHash('sha256').update(css).digest('base64url').slice(0, 8)
        const fileName = file.fileName.replace(/-[\w-]{8}\.css$/, `-${hash}.css`)
        for (const referrer of referrers) {
          const key = referrer.code != null ? 'code' : 'source'
          referrer[key] = String(referrer[key]).replaceAll(file.fileName, fileName)
        }
        delete bundle[file.fileName]
        this.emitFile({ type: 'asset', fileName, source: css })
      }
    }
  }
}
