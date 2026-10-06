// Pure containment gate; no environment, network, filesystem or application imports.
const profiles = new Map([
  ['--isolated-port=33316', Object.freeze({ port: 33316, version: '10.11.16-MariaDB', directory: 'data' })],
  ['--isolated-port=33317', Object.freeze({ port: 33317, version: '10.6.18-MariaDB', directory: 'data106' })],
])
export function rehearsalProfile(args) {
  if (args.length !== 1 || !profiles.has(args[0])) throw new Error('Explicit dedicated fixture port required')
  return profiles.get(args[0])
}
