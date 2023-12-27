import App from './pages/App';
import $node from './state/node.ts';

(async () => {
  document.body.append(new App());
  await $node.waitForStart();
})();
