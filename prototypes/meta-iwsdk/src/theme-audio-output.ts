export const THEME_MASTER_GAIN = 2.5;
const outputs = new WeakMap<AudioContext, GainNode>();

/** One output bus per AudioContext; repeated cues never stack boosts or destination connections. */
export function themeAudioOutput(context: AudioContext): GainNode {
  let output = outputs.get(context);
  if (!output) {
    output = context.createGain();
    output.gain.setValueAtTime(THEME_MASTER_GAIN, context.currentTime);
    output.connect(context.destination);
    outputs.set(context, output);
  }
  return output;
}

export function releaseThemeAudioOutput(context: AudioContext): void {
  outputs.get(context)?.disconnect();
  outputs.delete(context);
}
