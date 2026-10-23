import { buildSessionInit, normalizeReferenceSpec, resolveReferenceSpaceType,
  SessionMode, type World } from '@iwsdk/core';

/** Keep native AR optional-feature handling: unsupported overlays never force VR. */
export function arSessionInit(base: XRSessionInit, overlay: Element): XRSessionInit {
  return {
    ...base,
    optionalFeatures: [...new Set([...(base.optionalFeatures ?? []), 'dom-overlay'])],
    domOverlay: {root: overlay},
  };
}

/** Prototype-local launcher until IWSDK exposes DOM overlay in XROptions. */
export async function launchAR(
  world: World,
  overlay: HTMLElement,
  xr: Pick<XRSystem, 'requestSession'> | undefined = navigator.xr,
): Promise<boolean> {
  if(world.session || world.sessionRequestPending)return false;
  if(!world.xrEnabled || !xr)throw new Error('Mixed reality is unavailable in this browser.');
  const options = {...world.xrDefaults, sessionMode: SessionMode.ImmersiveAR};
  const init = arSessionInit(buildSessionInit(options), overlay);
  const reference = normalizeReferenceSpec(options.referenceSpace);
  const camera = world.camera.clone();
  let session: XRSession | undefined;
  let ended = false;
  world.sessionRequestPending = true;
  overlay.hidden = false;
  const onEnd = () => {
    ended = true;
    overlay.hidden = true;
    if(world.session === session)world.session = undefined;
    // Let Three finish releasing its XR camera before restoring the browser view.
    requestAnimationFrame(() => {
      if(!world.session && options.restoreCameraOnExit !== false) {
        world.camera.copy(camera, false);
        world.camera.updateMatrixWorld(true);
      }
    });
  };
  try {
    // Request synchronously in the click gesture. No capability probe or retry
    // may consume activation or silently open an immersive-vr session instead.
    session = await xr.requestSession('immersive-ar', init);
    session.addEventListener('end', onEnd, {once: true});
    const type = await resolveReferenceSpaceType(session, reference.type,
      reference.required ? [] : reference.fallbackOrder);
    if(ended)return false;
    world.renderer.xr.enabled = true;
    world.renderer.xr.setReferenceSpaceType(type);
    await world.renderer.xr.setSession(session);
    if(ended)return false;
    world.session = session;
    return true;
  } catch(error) {
    overlay.hidden = true;
    if(session) {
      try {await session.end();} catch { /* original setup error takes precedence */ }
    }
    throw error;
  } finally {
    world.sessionRequestPending = false;
  }
}
