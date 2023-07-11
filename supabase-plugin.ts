import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Plugin } from 'vite'

interface PluginConfig {
  name: string
  version: string
  supabaseApiKey: string
}

export const Supabase = (config: PluginConfig): Plugin => {
  let isBuildWatch: boolean
  let outDir: string

  return {
    name: 'vite-plugin-supabase',
    apply: 'build',
    enforce: 'post',
    configResolved: (userConfig) => {
      isBuildWatch = (userConfig.build.watch ?? false) as boolean
      outDir = userConfig.build.outDir
    },
    buildEnd: async (error) => {
      if (error || isBuildWatch) return

      try {
        await uploadFilesToSupabase(config, outDir)
      } catch (err) {
        console.log(err)
      }
    }
  }
}

async function uploadFilesToSupabase(
  config: PluginConfig,
  outDir: string
): Promise<void> {
  const __dirname = path.dirname(new URL(import.meta.url).pathname)
  const bucketId = 'registry'
  const supabase = createClient(
    'https://gtsodtluyfgsyrsxtdgi.supabase.co',
    config.supabaseApiKey,
    {
      auth: {
        persistSession: false
      }
    }
  )

  const files = await fs.readdir(path.join(__dirname, outDir), {
    encoding: 'utf-8',
    recursive: false,
    withFileTypes: true
  })

  for (const file of files) {
    if (!file.isFile() || !file.name.startsWith(config.name)) {
      continue
    }

    const dirPath = path.join(config.name, config.version)
    const fileBody = await fs.readFile(
      path.join(__dirname, outDir, file.name),
      {
        encoding: 'utf-8'
      }
    )

    const { error } = await supabase.storage
      .from(bucketId)
      .upload(path.join(dirPath, file.name), fileBody, {
        contentType: 'text/javascript',
        upsert: true
      })

    if (error) {
      console.log(error)
    } else {
      const publicUrl = supabase.storage
        .from(bucketId)
        .getPublicUrl(path.join(dirPath, file.name))

      console.log(publicUrl.data.publicUrl)
    }
  }
}
