const path = require('path')
const CompressionPlugin = require('compression-webpack-plugin')

function resolve (dir) {
    return path.join(__dirname, dir)
}

module.exports = {
    productionSourceMap: false,
    parallel: false,
    publicPath: process.env.VUE_APP_PUBLIC_PATH || '/',
    configureWebpack: config => {
        if (process.env.NODE_ENV === 'production') {
            if (config.optimization && config.optimization.minimizer && config.optimization.minimizer[0] && config.optimization.minimizer[0].options) {
                config.optimization.minimizer[0].options.parallel = false
                config.optimization.minimizer[0].options.terserOptions.compress = {
                    ...config.optimization.minimizer[0].options.terserOptions.compress,
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.error', 'console.warn', 'console.info', 'console.debug']
                }
            }
        }

        config.optimization = {
            ...config.optimization,
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    antdv: {
                        name: 'chunk-antdv',
                        test: /[\\/]node_modules[\\/]ant-design-vue[\\/]/,
                        chunks: 'initial',
                        priority: 40,
                        enforce: true
                    },
                    initialVendors: {
                        name: 'chunk-vendors',
                        test: /[\\/]node_modules[\\/]/,
                        chunks: 'initial',
                        priority: 20,
                        reuseExistingChunk: true
                    },
                    asyncVendors: {
                        test: /[\\/]node_modules[\\/]/,
                        chunks: 'async',
                        priority: 15,
                        reuseExistingChunk: true
                    },
                    echarts: {
                        name: 'chunk-echarts',
                        test: /[\\/]node_modules[\\/]echarts[\\/]/,
                        chunks: 'async',
                        priority: 30,
                        reuseExistingChunk: true
                    },
                    commons: {
                        name: 'chunk-commons',
                        minChunks: 2,
                        chunks: 'async',
                        priority: 5,
                        reuseExistingChunk: true
                    }
                }
            }
        }

        config.performance = {
            hints: false
        }

        config.stats = {
            ...(config.stats || {}),
            warningsFilter: [
                ...(Array.isArray(config.stats && config.stats.warningsFilter) ? config.stats.warningsFilter : []),
                /Conflicting order between:/,
                /Conflicting order\./
            ]
        }
    },
    chainWebpack: (config) => {
        config.resolve.alias
            .set('@$', resolve('src'))
            .set('@api', resolve('src/api'))
            .set('@assets', resolve('src/assets'))
            .set('@comp', resolve('src/components'))
            .set('@views', resolve('src/views'))
            .set('@layout', resolve('src/layout'))
            .set('@static', resolve('src/static'))
            .set('@mobile', resolve('src/modules/mobile'))
            .set('@ant-design/icons-vue$', resolve('node_modules/@ant-design/icons-vue/lib/index.js'))

        // Vue CLI 3 may omit this plugin in development mode. Only tap it
        // when it exists so `npm run serve` remains usable across CLI versions.
        if (config.plugins.has('extract-css')) {
            config.plugin('extract-css').tap(args => {
                args[0] = {
                    ...(args[0] || {}),
                    ignoreOrder: true
                }
                return args
            })
        }

        if (process.env.NODE_ENV === 'production') {
            config.plugins.delete('prefetch')
            config.plugins.delete('prefetch-index')
            config.plugin('compressionPlugin').use(new CompressionPlugin({
                test: /\.js$|.\css|.\less/,
                threshold: 10240,
                deleteOriginalAssets: false
            }))
        }

        config.module
            .rule('markdown')
            .test(/\.md$/)
            .use()
            .loader('file-loader')
            .end()
    },

    css: {
        loaderOptions: {
            less: {
                modifyVars: {
                    'primary-color': '#1890FF',
                    'link-color': '#1890FF',
                    'border-radius-base': '4px'
                },
                javascriptEnabled: true
            }
        }
    },

    devServer: {
        host: '0.0.0.0',
        port: 8080,
        // Let Vue Router resolve deep links such as /portal/home during local development.
        historyApiFallback: true,
        disableHostCheck: true,
        proxy: {
            '^/api(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/sys(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/teaching(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/student(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/classroom(?:$|/(?!online|review).*)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/class(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/homework(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/course(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/learning(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            },
            '^/uploads(?:/|$)': {
                target: 'http://127.0.0.1:8081',
                ws: true,
                changeOrigin: true
            }
        }
    },

    lintOnSave: false
}
