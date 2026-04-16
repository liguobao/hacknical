const path = require('path')

class EntryAssetsManifestPlugin {
  apply(compiler) {
    const pluginName = 'EntryAssetsManifestPlugin'
    const { Compilation, sources } = compiler.webpack

    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
        },
        () => {
          const publicPath = compilation.outputOptions.publicPath || ''
          const manifest = {}

          for (const [entryName, entrypoint] of compilation.entrypoints) {
            const entryAssets = {}

            entrypoint.getFiles()
              .filter(file => !file.endsWith('.map'))
              .forEach(file => {
                const ext = path.extname(file).slice(1)

                if (ext !== 'js' && ext !== 'css') {
                  return
                }

                const assetPath = `${publicPath}${file}`
                if (!entryAssets[ext]) {
                  entryAssets[ext] = assetPath
                  return
                }

                if (Array.isArray(entryAssets[ext])) {
                  entryAssets[ext].push(assetPath)
                  return
                }

                entryAssets[ext] = [entryAssets[ext], assetPath]
              })

            manifest[entryName] = entryAssets
          }

          compilation.emitAsset(
            'webpack-assets.json',
            new sources.RawSource(`${JSON.stringify(manifest, null, 2)}\n`)
          )
        }
      )
    })
  }
}

module.exports = EntryAssetsManifestPlugin
