const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/convert_data.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "convert_data.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  resolve: {
    extensions: [".js"],
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
  experiments: {
    outputModule: true,
  },
};
