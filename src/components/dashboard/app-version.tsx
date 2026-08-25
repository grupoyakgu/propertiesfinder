import packageJson from "../../../package.json";

/** A small, unobtrusive version footer for the Settings tab — reads straight
 * from package.json (build-time constant, no runtime cost) so it never drifts
 * out of sync with an actual release. */
export function AppVersion() {
  return (
    <div className="p-6 text-center">
      <p className="mx-auto max-w-xl text-xs text-muted-foreground">Version {packageJson.version}</p>
    </div>
  );
}
