import pkg from "../../../../package.json";

export const SITE_META = {
  version: pkg.version,
  githubUrl: pkg.repository.url,
  npmUrl: "https://www.npmjs.com/package/create-four-app",
  license: "MIT",
  licenseUrl: pkg.repository.url + "/blob/master/LICENSE",
  bugsUrl: pkg.bugs,
};
