import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { defineConfig, loadEnv } from 'vite'
import Userscript from 'vite-userscript-plugin'
import { author, license, version } from './package.json'
import { Supabase } from './supabase-plugin.js'

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), '')
  const name = 'supabase-registry'
  const bucketId = 'registry'

  const supabase = createClient(
    'https://gtsodtluyfgsyrsxtdgi.supabase.co',
    env['SUPABASE_API_KEY'],
    {
      auth: {
        persistSession: false
      }
    }
  )

  const updateURL = supabase.storage
    .from(bucketId)
    .getPublicUrl(path.join(name, `${name}.meta.js`))

  const downloadURL = supabase.storage
    .from(bucketId)
    .getPublicUrl(path.join(name, `${name}.user.js`))

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
          updateURL: updateURL.data.publicUrl,
          downloadURL: downloadURL.data.publicUrl,
          match: ['http://localhost:3000', 'https://example.com']
        },
        server: {
          port: 3000
        }
      }),
      Supabase({
        name,
        version,
        supabase,
        bucketId
      })
    ]
  }
})
