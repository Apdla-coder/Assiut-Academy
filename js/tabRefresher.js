(function () {
  if (window.__assiut_tab_refresher) return; // avoid duplicate installs
  window.__assiut_tab_refresher = true;

  const DEFAULT_INTERVAL = 60 * 1000; // 60s
  const MAX_BACKOFF_STEPS = 5;
  let backoff = 0;
  let currentInterval = DEFAULT_INTERVAL;
  let stopped = false;

  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  async function runOnce() {
    if (document.visibilityState !== "visible") return;
    if (typeof updateCurrentTab !== "function") return;
    try {
      await updateCurrentTab();
      backoff = 0;
      currentInterval = DEFAULT_INTERVAL;
    } catch (err) {
      console.warn("Periodic updateCurrentTab() failed, backing off", err);
      backoff = Math.min(MAX_BACKOFF_STEPS, backoff + 1);
      currentInterval = Math.min(
        DEFAULT_INTERVAL * Math.pow(2, backoff),
        DEFAULT_INTERVAL * Math.pow(2, MAX_BACKOFF_STEPS)
      );
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runOnce().catch(() => {});
  });

  window.addEventListener("focus", () => { runOnce().catch(() => {}); });

  (async function loop() {
    await sleep(1500);
    while (!stopped) {
      await runOnce();
      await sleep(currentInterval);
    }
  })();

  window.assiutTabRefresher = {
    stop() { stopped = true; },
    start() {
      if (stopped) {
        stopped = false;
        (async function () {
          while (!stopped) {
            await runOnce();
            await sleep(currentInterval);
          }
        })();
      }
    },
    setIntervalMs(ms) {
      currentInterval = Math.max(1000, Number(ms) || DEFAULT_INTERVAL);
    }
  };
})();
