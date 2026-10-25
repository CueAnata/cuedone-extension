/** Handle both physical Enter and soft-keyboard line-break actions, without navigation. */
export function bindTaskEntry(input: EventTarget, submit: () => void, form?: EventTarget): () => void {
  let enterHeld = false;
  let composing = false;
  const down = (event: Event) => {
    const key = event as KeyboardEvent;
    if(key.key !== 'Enter' || composing || key.isComposing || key.keyCode === 229)return;
    event.preventDefault();
    event.stopPropagation();
    if(enterHeld || key.repeat)return;
    enterHeld = true;
    submit();
  };
  const up = (event: Event) => {if((event as KeyboardEvent).key === 'Enter')enterHeld = false;};
  const beforeInput = (event: Event) => {
    const inputEvent = event as InputEvent;
    if(composing || inputEvent.isComposing || !['insertLineBreak','insertParagraph'].includes(inputEvent.inputType))return;
    event.preventDefault();
    event.stopPropagation();
    if(!enterHeld)submit();
  };
  const onSubmit = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if(!composing && !enterHeld)submit();
  };
  const startComposition = () => {composing = true;};
  const endComposition = () => {composing = false;};
  const blur = () => {enterHeld = composing = false;};
  const listeners: Array<[string, EventListener]> = [
    ['keydown',down],['keyup',up],['beforeinput',beforeInput],
    ['compositionstart',startComposition],['compositionend',endComposition],['blur',blur],
  ];
  for(const [type,listener] of listeners)input.addEventListener(type,listener);
  form?.addEventListener('submit',onSubmit);
  return () => {
    for(const [type,listener] of listeners)input.removeEventListener(type,listener);
    form?.removeEventListener('submit',onSubmit);
  };
}
