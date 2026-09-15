let owners = 0;
let original = "";
export function acquireModalScroll() {
  if (owners++ === 0) {
    original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--owners === 0) document.body.style.overflow = original;
  };
}
