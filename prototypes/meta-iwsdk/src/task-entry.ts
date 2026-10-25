/** Native/Quest keyboard actions save explicitly; ordinary editing never saves. */
export function bindTaskEntry(input: EventTarget, submit: () => void, form?: EventTarget): () => void {
  let enterHandled = false;
  let composing = false;
  const isReturn = (key: KeyboardEvent) =>
    ['Enter', 'Return'].includes(key.key) || ['Enter', 'NumpadEnter'].includes(key.code) || key.keyCode === 13;
  const inComposition = (event: KeyboardEvent | InputEvent) => composing || event.isComposing;
  const prevent = (event: Event) => {event.preventDefault(); event.stopPropagation();};
  const down = (event: Event) => {
    const key = event as KeyboardEvent;
    if(!isReturn(key) || inComposition(key))return;
    prevent(event);
    if(key.repeat)return;
    // Soft keyboards can omit keyup. Each new non-repeat keydown is a new action.
    enterHandled = true;
    submit();
  };
  const up = (event: Event) => {
    const key = event as KeyboardEvent;
    if(!isReturn(key) || inComposition(key))return;
    prevent(event);
    // Some IMEs report only the release of their action key.
    if(!enterHandled)submit();
    enterHandled = false;
  };
  const beforeInput = (event: Event) => {
    const edit = event as InputEvent;
    if(inComposition(edit))return;
    if(!['insertLineBreak','insertParagraph'].includes(edit.inputType)) {
      enterHandled = false;
      return;
    }
    prevent(event);
    if(!enterHandled)submit();
    enterHandled = true;
  };
  const onSubmit = (event: Event) => {
    prevent(event);
    if(!composing && !enterHandled) {enterHandled = true; submit();}
  };
  const editing = () => {enterHandled = false;};
  const startComposition = () => {composing = true; enterHandled = false;};
  const endComposition = () => {composing = false; enterHandled = false;};
  const blur = () => {enterHandled = composing = false;};
  const listeners: Array<[string, EventListener]> = [
    ['keydown',down],['keyup',up],['beforeinput',beforeInput],['input',editing],
    ['compositionstart',startComposition],['compositionend',endComposition],['blur',blur],
  ];
  // Capture before UI-library keyboard handlers can consume a native Return.
  for(const [type,listener] of listeners)input.addEventListener(type,listener,{capture: true});
  form?.addEventListener('submit',onSubmit);
  return () => {
    for(const [type,listener] of listeners)input.removeEventListener(type,listener,{capture: true});
    form?.removeEventListener('submit',onSubmit);
  };
}
