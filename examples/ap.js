const {Wireless, AP} = require('..');
const wireless = new Wireless();

(async () => {
  const mode = await wireless.mode();
  if (mode === 'station') {
    await wireless.disconnect();
  }

  const ap = AP.create('WIRELESSER');

  ap.on('stdout', data => output(data, console.log));
  ap.on('stderr', data => output(data, console.error));

  ap.on('started', () => console.log('>>>> started'));
  ap.on('close', () => console.log('>>>> closed'));

  function cleanup(sig) {
    console.log(sig);
    ap.close().then(() => {
      console.log('>>>> exit');
    });
  }

  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
})();

function output(data, log) {
  data.trim().split(/[\n\r]/).forEach(line => log(`[ap] ${line}`));
}

