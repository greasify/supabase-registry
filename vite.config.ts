import { defineConfig, loadEnv } from 'vite'
import Userscript from 'vite-userscript-plugin'
import { author, homepage, license, version } from './package.json'
import { Supabase } from './supabase-plugin.js'

const name = 'publish-to-registry'

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), '')

  return {
    plugins: [
      Userscript({
        fileName: name,
        entry: 'src/index.ts',
        header: {
          name,
          version,
          author,
          license,
          homepage,
          match: ['http://localhost:3000', 'https://example.com']
        },
        server: {
          port: 3000
        }
      }),
      Supabase({
        name,
        version,
        supabaseApiKey: env['SUPABASE_API_KEY']!
      })
    ]
  }
})
