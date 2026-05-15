const path = require("path");
const fs = require("fs");
const { withDangerousMod } = require("expo/config-plugins");

const MARKER = "agreeonatime: enforce IPHONEOS_DEPLOYMENT_TARGET on all pods";
const MIN_IOS = "16.4";

/**
 * Podspecs (e.g. expo-secure-store) still declare iOS 15.1 while ExpoModulesCore
 * ships as Swift 16.4+. Force every Pods target to match the app minimum.
 */
function insertPodDeploymentSnippet(podfile) {
  if (podfile.includes(MARKER)) {
    return podfile;
  }
  const token = "react_native_post_install(";
  const start = podfile.indexOf(token);
  if (start === -1) {
    return null;
  }
  let i = start + token.length;
  let depth = 1;
  while (i < podfile.length && depth > 0) {
    const ch = podfile[i];
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
    }
    i += 1;
  }
  const snippet = `
    # ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |pod_config|
        pod_config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "${MIN_IOS}"
      end
    end`;
  return podfile.slice(0, i) + snippet + podfile.slice(i);
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = function withIosPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      const podfile = fs.readFileSync(podfilePath, "utf8");
      const next = insertPodDeploymentSnippet(podfile);
      if (next != null && next !== podfile) {
        fs.writeFileSync(podfilePath, next);
      }
      return cfg;
    },
  ]);
};
