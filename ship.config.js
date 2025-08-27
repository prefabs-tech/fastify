// Currently, ship.js does not support ignoring individual packages.
// The code below is adapted from shipjs-lib to ignore specific packages by prefixing their names with "!".
// Reference: https://github.com/algolia/shipjs/blob/main/packages/shipjs-lib/src/lib/util/expandPackageList.js
const { resolve, join, sep } = require("path");
const { statSync, readdirSync, existsSync } = require("fs");

const isDirectory = (dir) => statSync(dir).isDirectory();
const getDirectories = (dir) =>
  readdirSync(dir)
    .map((name) => join(dir, name))
    .filter(isDirectory);
const hasPackageJson = (dir) => existsSync(`${dir}/package.json`);
const flatten = (arr) => arr.reduce((acc, item) => acc.concat(item), []);

function expandPackageList(list, dir = ".") {
  const isPackageIgnored = (package) => {
    return expandPackageList(list
      .filter(value => value.startsWith("!"))
      .map(item => item.slice(1))
    ).includes(package);
  }

  return flatten(
    list.map((item) => {
      if (item.startsWith("!")) {
        return;
      }

      const partIndex = item
        .split(sep)
        .findIndex((part) => part.startsWith("@(") && part.endsWith(")"));
      if (partIndex !== -1) {
        const parts = item.split(sep);
        const part = parts[partIndex];
        const newList = part
          .slice(2, part.length - 1)
          .split("|")
          .map((subPart) => {
            const newParts = [...parts];
            newParts[partIndex] = subPart;
            return newParts.join(sep);
          });
        return expandPackageList(newList, dir);
      }

      if (item.endsWith("/*")) {
        const basePath = resolve(dir, item.slice(0, item.length - 2));
        return expandPackageList(getDirectories(basePath), dir);
      } else {
        return resolve(dir, item);
      }
    })
  ).filter((package) => !isPackageIgnored(package)).filter(hasPackageJson)
}

// ship.js config
module.exports = {
  appName: "@prefabs.tech/fastify",
  buildCommand: ({ isYarn, version }) => {
    return "pnpm build";
  },
  installCommand: ({ isYarn }) => {
    return "pnpm -r install";
  },
  monorepo: {
    mainVersionFile: "package.json",
    packagesToBump: expandPackageList(["packages/*"]),
    packagesToPublish: expandPackageList(["packages/*"]),
  },
  publishCommand: ({ isYarn, tag, defaultCommand, dir }) => {
    return "pnpm publish --access public";
  },
};
