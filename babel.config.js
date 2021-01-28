module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        corejs: { version: 3, proposals: true, },
        useBuiltIns: 'usage',
      },
    ],
  ],
  plugins: ['@babel/plugin-transform-runtime'],
  exclude: [/core-js/],
}
