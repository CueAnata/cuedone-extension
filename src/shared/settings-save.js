// Serialize changes so a failed rapid edit restores the latest saved value.
export function createSettingsSaver(showError) {
  let pending = Promise.resolve();
  const lastSaved = new Map();
  return function saveSetting({ save, load, value, apply, restore, commit = apply }) {
    const operation = pending.then(async () => {
      try {
        await save(value);
        lastSaved.set(save, value);
        commit(value);
        showError("");
        return true;
      } catch {
        try {
          apply(await load());
        } catch {
          if (lastSaved.has(save)) {
            apply(lastSaved.get(save));
          } else {
            restore();
          }
        }
        showError("CueDone could not save that setting. Your last saved setting is unchanged.");
        return false;
      }
    });
    pending = operation.catch(() => {});
    return operation;
  };
}
