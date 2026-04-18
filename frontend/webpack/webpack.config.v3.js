const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const EntryAssetsManifestPlugin = require('./plugins/entry-assets-manifest-plugin')
const PATH = require('../../config/path')

const env = process.env.NODE_ENV || 'localdev'
const isProduction = env === 'production'

const entryFiles = fs.readdirSync(PATH.ENTRY_PATH)
const entries = {}

entryFiles
  .filter(file =>
    file.split('.')[0] && file.split('.').slice(-1)[0] === 'js'
  )
  .forEach(file => {
    const filename = file.split('.')[0]
    const filepath = path.join(PATH.ENTRY_PATH, file)
    entries[filename] = ['core-js/stable', 'regenerator-runtime/runtime', filepath]
  })

const createCssLoader = ({ modules = false, lightUi = false }) => {
  const cssLoaderOptions = {
    esModule: false,
    importLoaders: 1,
    sourceMap: true
  }

  if (modules) {
    cssLoaderOptions.modules = {
      localIdentName: '[name]__[local]___[hash:base64:5]'
    }
  }

  const loaders = [
    MiniCssExtractPlugin.loader,
    {
      loader: 'css-loader',
      options: cssLoaderOptions
    },
    {
      loader: 'postcss-loader',
      options: {
        sourceMap: true,
        postcssOptions: {
          config: false,
          ...require('./postcss.config')
        }
      }
    }
  ]

  if (lightUi) {
    loaders.splice(2, 0, {
      loader: path.join(__dirname, 'loaders/light-ui-compose-loader.js')
    })
  }

  return loaders
}

module.exports = {
  mode: isProduction ? 'production' : 'development',
  context: PATH.ROOT_PATH,
  entry: entries,
  output: {
    filename: isProduction ? '[name].bundle.[contenthash:8].js' : '[name].bundle.js',
    path: PATH.BUILD_PATH,
    publicPath: PATH.PUBLIC_PATH,
    clean: true,
    assetModuleFilename: isProduction ? '[name].[contenthash:8][ext]' : '[name][ext]'
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [
        __filename,
        path.join(__dirname, 'postcss.config.js'),
        path.join(__dirname, 'plugins/entry-assets-manifest-plugin.js')
      ]
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        oneOf: [
          {
            include: path.join(PATH.SOURCE_PATH, 'src/vendor'),
            use: createCssLoader({ modules: false })
          },
          {
            include: /light-ui/,
            use: createCssLoader({ modules: true, lightUi: true })
          },
          {
            include: PATH.SOURCE_PATH,
            use: createCssLoader({ modules: true })
          },
          {
            include: PATH.MODULES_PATH,
            use: createCssLoader({ modules: false })
          }
        ]
      },
      {
        test: /\.jsx?$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader'
      },
      {
        test: /\.(eot|ttf|woff|woff2|otf)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource'
      },
      {
        test: /\.(jpe?g|png|gif|svg)\??.*$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192
          }
        }
      }
    ]
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      COMPONENTS: path.join(PATH.SOURCE_PATH, 'components'),
      SRC: path.join(PATH.SOURCE_PATH, 'src'),
      STYLES: path.join(PATH.SOURCE_PATH, 'src/styles'),
      UTILS: path.join(PATH.SOURCE_PATH, 'utils'),
      PAGES: path.join(PATH.SOURCE_PATH, 'pages'),
      API: path.join(PATH.SOURCE_PATH, 'api'),
      SHARED: path.join(PATH.SOURCE_PATH, 'pages/shared'),
      LOCALES: path.join(PATH.SOURCE_PATH, 'utils/locales')
    }
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: ['jquery', 'default'],
      jQuery: ['jquery', 'default']
    }),
    new EntryAssetsManifestPlugin(),
    new MiniCssExtractPlugin({
      filename: isProduction ? '[name].bundle.[contenthash:8].css' : '[name].bundle.css',
      ignoreOrder: true
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.SENTRY': JSON.stringify(process.env.HACKNICAL_SENTRY),
      'process.env.URI': JSON.stringify(PATH.CDN_URL)
    }),
    new webpack.BannerPlugin({
      entryOnly: true,
      banner: 'BUILD WITH LOVE BY ECMADAO'
    })
  ]
}
