const CHANNEL_NAME = 'stories-in-swadya-output';

export function startStudioOutput() {
  const stage = document.querySelector('#output-stage');
  if (!stage) return;

  let frame = 0;
  const refresh = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => window.SwadyaStudio.decorateSvgRuntime(stage));
  };

  const observer = new MutationObserver(mutations => {
    const meaningful = mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes]
      .some(node => node.nodeType !== 1 || !node.hasAttribute?.('data-studio-runtime')));
    if (meaningful) refresh();
  });
  observer.observe(stage, { childList: true });

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener('message', event => {
    if (event.data?.type === 'scene') setTimeout(refresh, 0);
  });

  window.addEventListener('storage', event => {
    if (event.key === 'stories-in-swadya-studio-v1') refresh();
  });

  refresh();
}
