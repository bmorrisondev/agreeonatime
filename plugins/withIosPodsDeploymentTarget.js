const {
  createGeneratedHeaderComment,
  removeGeneratedContents,
} = require('@expo/config-plugins/build/utils/generateCode');
const { withPodfile } = require('expo/config-plugins');

const TAG = 'agreeonatime-ios-pods-min-deployment';

/**
 * @param {string} contents
 * @returns {number} index after closing `)` of `react_native_post_install(...)`
 */
function findIndexAfterReactNativePostInstallCall(contents) {
  const needle = 'react_native_post_install';
  const callIdx = contents.indexOf(needle);
  if (callIdx === -1) {
    throw new Error(
      `${TAG}: Podfile has no react_native_post_install( — cannot align iOS deployment targets.`
    );
  }
  const openParen = contents.indexOf('(', callIdx);
  if (openParen === -1) {
    throw new Error(`${TAG}: Malformed Podfile (missing '(' after react_native_post_install).`);
  }

  let depth = 0;
  for (let i = openParen; i < contents.length; i += 1) {
    const ch = contents[i];
    if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }

  throw new Error(`${TAG}: Unbalanced parentheses in react_native_post_install(...) Podfile block.`);
}

/**
 * After `react_native_post_install`, force every pod native target to `minimumIosVersion`
 * (RN post_install only raises to max(15.1, podspec), which leaves ExpoSecureStore at 15.1
 * while ExpoModulesCore is 16.4+).
 *
 * @param {import('expo/config').ExpoConfig} config
 * @param {{ minimumIosVersion?: string }} [props]
 * @returns {import('expo/config').ExpoConfig}
 */
function withIosPodsDeploymentTarget(config, props = {}) {
  const minimumIosVersion = props.minimumIosVersion ?? '16.4';
  const minimumIosFloat = Number.parseFloat(minimumIosVersion);
  if (Number.isNaN(minimumIosFloat)) {
    throw new Error(
      `${TAG}: invalid minimumIosVersion "${minimumIosVersion}" (expected e.g. 16.4).`
    );
  }

  const rubyBody = [
    '    installer.target_installation_results.pod_target_installation_results.each do |_pod_name, target_installation_result|',
    '      target_installation_result.native_target.build_configurations.each do |build_config|',
    `        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minimumIosVersion}'`,
    `        build_config.build_settings['SWIFT_DEPLOYMENT_TARGET'] = '${minimumIosVersion}'`,
    '      end',
    '    end',
  ].join('\n');

  return withPodfile(config, (modConfig) => {
    let src = modConfig.modResults.contents;
    const stripped = removeGeneratedContents(src, TAG);
    if (stripped) {
      src = stripped;
    }

    const insertAt = findIndexAfterReactNativePostInstallCall(src);
    const header = createGeneratedHeaderComment(rubyBody, TAG, '#');
    const footer = `# @generated end ${TAG}`;
    const block = `\n${header}\n${rubyBody}\n${footer}\n`;

    const next = `${src.slice(0, insertAt)}${block}${src.slice(insertAt)}`;
    if (!next.includes(TAG)) {
      throw new Error(`${TAG}: internal error — generated Podfile fragment missing tag.`);
    }

    modConfig.modResults.contents = next;
    return modConfig;
  });
}

module.exports = withIosPodsDeploymentTarget;
