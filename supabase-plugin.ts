import fs from 'node:fs/promises'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plugin } from 'vite'

interface PluginConfig {
  name: string
  version: string
  bucketId: string
  supabase: SupabaseClient
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

const fileOptions = {
  contentType: 'text/javascript',
  upsert: true,
  cacheControl: '0'
}

async function uploadFilesToSupabase(
  config: PluginConfig,
  outDir: string
): Promise<void> {
  const __dirname = path.dirname(new URL(import.meta.url).pathname)

  const files = await fs.readdir(path.join(__dirname, outDir), {
    encoding: 'utf-8',
    recursive: false,
    withFileTypes: true
  })

  for (const file of files) {
    if (!file.isFile() || !file.name.startsWith(config.name)) {
      continue
    }

    const versionPathDir = path.join(config.name, config.version)
    const fileBody = await fs.readFile(
      path.join(__dirname, outDir, file.name),
      {
        encoding: 'utf-8'
      }
    )

    // registry/<name>/<version>/<name>.user.js
    const { error } = await config.supabase.storage
      .from(config.bucketId)
      .upload(path.join(versionPathDir, file.name), fileBody, fileOptions)

    if (error) {
      console.log(error)
    } else {
      const publicUrl = config.supabase.storage
        .from(config.bucketId)
        .getPublicUrl(path.join(versionPathDir, file.name))

      console.log(publicUrl.data.publicUrl)
    }

    // registry/<name>/<name>.user.js
    const { error: error2 } = await config.supabase.storage
      .from(config.bucketId)
      .upload(path.join(config.name, file.name), fileBody, fileOptions)

    if (error2) {
      console.log(error2)
    } else {
      const publicUrl = config.supabase.storage
        .from(config.bucketId)
        .getPublicUrl(path.join(config.name, file.name))

      console.log(publicUrl.data.publicUrl)
    }
  }
}
