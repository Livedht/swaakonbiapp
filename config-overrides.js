const webpack = require('webpack');

module.exports = function override(config) {
    if (!config.resolve) {
        config.resolve = {};
    }
    if (!config.resolve.fallback) {
        config.resolve.fallback = {};
    }

    // Add specific polyfills
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "url": require.resolve("url"),
        "zlib": require.resolve("browserify-zlib"),
        "process": false,
        "util": require.resolve("util/"),
        "assert": require.resolve("assert/"),
        "fs": false,
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "net": false,
        "tls": false,
        "child_process": false,
        "dns": false,
        "dgram": false,
        "querystring": require.resolve("querystring-es3")
    };

    // Add webpack plugins
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: require.resolve('process/browser')
        })
    ]);

    // Remove process alias
    config.resolve.alias = {
        ...config.resolve.alias
    };

    // Handle source maps
    config.ignoreWarnings = [
        /Failed to parse source map/,
        /Critical dependency/,
        /Module not found: Error: Can't resolve/
    ];

    return config;
} 