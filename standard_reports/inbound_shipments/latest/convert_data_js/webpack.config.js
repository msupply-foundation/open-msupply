const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/convert_data.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "convert_data.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  resolve: {
    extensions: [".js", ".ts"],
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts)$/,
        exclude: /node_modules/,
        resolve: {
          extensions: [".ts", ".js", ".json"],
        },
        use: "ts-loader",
      },
    ],
  },
};
