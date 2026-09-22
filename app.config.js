const baseConfig = require('./app.json').expo;
const packageJson = require('./package.json');

const DISTRIBUTIONS = new Set(['github', 'store']);
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_COMPONENT = 999;
const INSTALL_PACKAGES_PERMISSION = 'android.permission.REQUEST_INSTALL_PACKAGES';
const STORE_BLOCKED_PERMISSIONS = [
  INSTALL_PACKAGES_PERMISSION,
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

function getVersionInfo(version) {
  const match = SEMVER_PATTERN.exec(version);

  if (!match) {
    throw new Error(
      `[app.config.js] package.json version "${version}" must be a stable MAJOR.MINOR.PATCH SemVer without a prerelease or build suffix.`,
    );
  }

  const [major, minor, patch] = match.slice(1).map(Number);
  if ([major, minor, patch].some((component) => component > MAX_COMPONENT)) {
    throw new Error(
      `[app.config.js] SemVer components must not exceed ${MAX_COMPONENT}; received "${version}".`,
    );
  }

  return {
    version,
    versionCode: major * 1_000_000 + minor * 1_000 + patch,
  };
}

function deriveVersionCode(version) {
  return getVersionInfo(version).versionCode;
}

function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function createConfig(sourceConfig = baseConfig) {
  const distribution = process.env.FOLIO_DISTRIBUTION || 'github';
  if (!DISTRIBUTIONS.has(distribution)) {
    throw new Error(
      `FOLIO_DISTRIBUTION must be "github" or "store"; received ${JSON.stringify(distribution)}.`,
    );
  }

  const storeBuild = distribution === 'store';
  // Branche `foyer` (constructions du foyer, hors magasin) : FOYER_BUILD=<n> distingue chaque construction d'une même
  // version amont pour que F-Droid la voie comme une mise à jour (versionName 0.3.5-foyer.<n>, versionCode ×100+<n>).
  const foyerBuild = /^\d{1,2}$/.test(process.env.FOYER_BUILD ?? '') ? Number(process.env.FOYER_BUILD) : null;
  const upstream = getVersionInfo(packageJson.version);
  const version = foyerBuild === null ? upstream.version : `${upstream.version}-foyer.${foyerBuild}`;
  const versionCode = foyerBuild === null ? upstream.versionCode : upstream.versionCode * 100 + foyerBuild;
  const plugins = (sourceConfig.plugins ?? []).filter(
    (plugin) => !(storeBuild && pluginName(plugin) === './plugins/withAndroidReleaseSigning'),
  );
  plugins.push('./plugins/withFolioPlatformIntegrations');
  plugins.push([
    'expo-widgets',
    {
      bundleIdentifier: 'app.folio.paperless.widgets',
      groupIdentifier: 'group.app.folio.paperless',
      enablePushNotifications: false,
      frequentUpdates: false,
      enableAndroid: false,
      widgets: [
        {
          name: 'FolioInboxWidget',
          displayName: 'folio_widget_display_name',
          description: 'folio_widget_description',
          supportedFamilies: ['systemSmall'],
          contentMarginsDisabled: false,
          android: null,
        },
      ],
    },
  ]);
  if (storeBuild) plugins.push('./plugins/withFolioDistributionGuard');

  const configuredPermissions = sourceConfig.android?.permissions ?? [];
  const androidPermissions = storeBuild
    ? configuredPermissions.filter((permission) => !STORE_BLOCKED_PERMISSIONS.includes(permission))
    : configuredPermissions;

  return {
    ...sourceConfig,
    version,
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    ios: {
      ...sourceConfig.ios,
      buildNumber: String(versionCode),
    },
    android: {
      ...sourceConfig.android,
      versionCode,
      permissions: androidPermissions,
      ...(storeBuild
        ? {
            blockedPermissions: [
              ...new Set([
                ...(sourceConfig.android?.blockedPermissions ?? []),
                ...STORE_BLOCKED_PERMISSIONS,
              ]),
            ],
          }
        : {}),
    },
    plugins,
    extra: {
      ...(sourceConfig.extra ?? {}),
      folioDistribution: distribution,
      supportsInAppApkUpdates: !storeBuild,
      ...(process.env.EAS_PROJECT_ID
        ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
        : {}),
    },
  };
}

function configureExpo({ config } = { config: baseConfig }) {
  return createConfig(config);
}

module.exports = configureExpo;
module.exports.createConfig = () => createConfig(baseConfig);
module.exports.deriveVersionCode = deriveVersionCode;
